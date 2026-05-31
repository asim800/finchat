// Accounts capability — typed public API. Owns Account + RealEstateDetails persistence.
//
// HTTP face: app/api/accounts/* (thin wrappers over these functions).
// Other capabilities and server code should import from here, never from internal files.

import { prisma } from '../db';
import type {
  AccountType,
  AccountWithRealEstate,
  CreateAccountInput,
  UpdateAccountInput,
  RealEstateDetailsInput,
} from './types';
import { ACCOUNT_TYPES } from './types';

export * from './types';

// ---- internal helpers ----

function assertValidAccountType(t: unknown): asserts t is AccountType {
  if (typeof t !== 'string' || !ACCOUNT_TYPES.includes(t as AccountType)) {
    throw new Error(`Invalid accountType: ${String(t)}`);
  }
}

async function findOwned(accountId: string, userId: string) {
  const acc = await prisma.account.findFirst({
    where: { id: accountId, userId },
    include: { realEstate: true },
  });
  return acc as AccountWithRealEstate | null;
}

// ---- public API ----

/** List a user's accounts. Optionally filter by portfolio or retirement-tag. */
export async function listAccountsByUser(
  userId: string,
  opts: { portfolioId?: string; isRetirement?: boolean } = {}
): Promise<AccountWithRealEstate[]> {
  if (!userId) throw new Error('userId required');
  const accs = await prisma.account.findMany({
    where: {
      userId,
      ...(opts.portfolioId !== undefined ? { portfolioId: opts.portfolioId } : {}),
      ...(opts.isRetirement !== undefined ? { isRetirement: opts.isRetirement } : {}),
    },
    include: { realEstate: true },
    orderBy: [{ createdAt: 'asc' }],
  });
  return accs as AccountWithRealEstate[];
}

/** Get a single account, verifying ownership. Returns null if not found / not owned. */
export async function getAccount(
  accountId: string,
  userId: string
): Promise<AccountWithRealEstate | null> {
  if (!accountId || !userId) throw new Error('accountId and userId required');
  return findOwned(accountId, userId);
}

/** Create a new account for the user. */
export async function createAccount(
  input: CreateAccountInput,
  userId: string
): Promise<AccountWithRealEstate> {
  if (!userId) throw new Error('userId required');
  if (!input.accountName?.trim()) throw new Error('accountName required');
  assertValidAccountType(input.accountType);

  // If portfolioId provided, verify the portfolio belongs to this user.
  if (input.portfolioId) {
    const owns = await prisma.portfolio.findFirst({
      where: { id: input.portfolioId, userId },
      select: { id: true },
    });
    if (!owns) throw new Error('portfolio not found or not owned by user');
  }

  const created = await prisma.account.create({
    data: {
      userId,
      portfolioId: input.portfolioId ?? null,
      accountName: input.accountName.trim(),
      accountType: input.accountType,
      isRetirement: input.isRetirement ?? false,
      balance: input.balance ?? null,
      currency: input.currency ?? 'USD',
    },
    include: { realEstate: true },
  });
  return created as AccountWithRealEstate;
}

/** Update an account; verifies ownership. */
export async function updateAccount(
  accountId: string,
  input: UpdateAccountInput,
  userId: string
): Promise<AccountWithRealEstate> {
  const existing = await findOwned(accountId, userId);
  if (!existing) throw new Error('account not found or not owned by user');

  if (input.accountType !== undefined) assertValidAccountType(input.accountType);
  if (input.portfolioId !== undefined && input.portfolioId !== null) {
    const owns = await prisma.portfolio.findFirst({
      where: { id: input.portfolioId, userId },
      select: { id: true },
    });
    if (!owns) throw new Error('portfolio not found or not owned by user');
  }

  const updated = await prisma.account.update({
    where: { id: accountId },
    data: {
      ...(input.portfolioId !== undefined ? { portfolioId: input.portfolioId } : {}),
      ...(input.accountName !== undefined ? { accountName: input.accountName.trim() } : {}),
      ...(input.accountType !== undefined ? { accountType: input.accountType } : {}),
      ...(input.isRetirement !== undefined ? { isRetirement: input.isRetirement } : {}),
      ...(input.balance !== undefined ? { balance: input.balance } : {}),
      ...(input.currency !== undefined ? { currency: input.currency } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
    include: { realEstate: true },
  });
  return updated as AccountWithRealEstate;
}

/** Delete an account; verifies ownership. Cascades to RealEstateDetails. */
export async function deleteAccount(accountId: string, userId: string): Promise<void> {
  const existing = await findOwned(accountId, userId);
  if (!existing) throw new Error('account not found or not owned by user');
  await prisma.account.delete({ where: { id: accountId } });
}

/** Upsert real-estate details for a RealEstate-type account. */
export async function upsertRealEstateDetails(
  accountId: string,
  input: RealEstateDetailsInput,
  userId: string
): Promise<AccountWithRealEstate> {
  const existing = await findOwned(accountId, userId);
  if (!existing) throw new Error('account not found or not owned by user');
  if (existing.accountType !== 'RealEstate') {
    throw new Error('real-estate details only allowed on RealEstate accounts');
  }
  if (typeof input.currentValue !== 'number' || input.currentValue < 0) {
    throw new Error('currentValue must be a non-negative number');
  }
  if (!['primary_home', 'rental', 'other'].includes(input.propertyType)) {
    throw new Error('invalid propertyType');
  }

  await prisma.realEstateDetails.upsert({
    where: { accountId },
    create: {
      accountId,
      propertyType: input.propertyType,
      currentValue: input.currentValue,
      outstandingLoan: input.outstandingLoan ?? null,
      interestRate: input.interestRate ?? null,
      monthlyPayment: input.monthlyPayment ?? null,
    },
    update: {
      propertyType: input.propertyType,
      currentValue: input.currentValue,
      outstandingLoan: input.outstandingLoan ?? null,
      interestRate: input.interestRate ?? null,
      monthlyPayment: input.monthlyPayment ?? null,
    },
  });

  return (await findOwned(accountId, userId))!;
}
