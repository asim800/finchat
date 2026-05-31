// Income capability — typed public API. Owns CashFlow persistence.
//
// HTTP face: app/api/income/* (thin wrappers).
// Designed for *low-friction* data collection: most fields nullable; the
// only hard requirements are kind, category, and a positive amount.
// Other capabilities and server code (incl. chat) should import from here,
// never from internal files.

import { prisma } from '../db';
import type {
  CashFlow,
  CashFlowCategory,
  CashFlowKind,
  CreateCashFlowInput,
  UpdateCashFlowInput,
} from './types';
import {
  EXPENSE_CATEGORIES,
  FREQ_PER_MONTH,
  INCOME_CATEGORIES,
} from './types';

export * from './types';

// ---- internal helpers ----

function coerceDate(d: Date | string | null | undefined): Date | null {
  if (d === undefined || d === null || d === '') return null;
  return d instanceof Date ? d : new Date(d);
}

function assertCategoryMatchesKind(kind: CashFlowKind, category: CashFlowCategory) {
  const list = kind === 'Income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  if (!list.includes(category)) {
    throw new Error(`category '${category}' does not match kind '${kind}'`);
  }
}

async function findOwned(id: string, userId: string): Promise<CashFlow | null> {
  return prisma.cashFlow.findFirst({ where: { id, userId } });
}

// ---- public API ----

/** List a user's cash flows. Optional filters by kind, category, or as-of date. */
export async function listCashFlowsByUser(
  userId: string,
  opts: { kind?: CashFlowKind; category?: CashFlowCategory; atDate?: Date | string } = {}
): Promise<CashFlow[]> {
  if (!userId) throw new Error('userId required');

  const atDate = opts.atDate ? coerceDate(opts.atDate) : null;
  const dateFilter = atDate
    ? {
        AND: [
          { OR: [{ startDate: null }, { startDate: { lte: atDate } }] },
          { OR: [{ endDate: null }, { endDate: { gte: atDate } }] },
        ],
      }
    : {};

  return prisma.cashFlow.findMany({
    where: {
      userId,
      isActive: true,
      ...(opts.kind ? { kind: opts.kind } : {}),
      ...(opts.category ? { category: opts.category } : {}),
      ...dateFilter,
    },
    orderBy: [{ kind: 'asc' }, { category: 'asc' }, { createdAt: 'asc' }],
  });
}

/** Get a single cash flow, verifying ownership. */
export async function getCashFlow(id: string, userId: string): Promise<CashFlow | null> {
  if (!id || !userId) throw new Error('id and userId required');
  return findOwned(id, userId);
}

/** Create a cash flow. Low friction — only kind/category/amount required. */
export async function createCashFlow(input: CreateCashFlowInput, userId: string): Promise<CashFlow> {
  if (!userId) throw new Error('userId required');
  if (!input.kind) throw new Error('kind required');
  if (!input.category) throw new Error('category required');
  if (typeof input.amount !== 'number' || !isFinite(input.amount) || input.amount <= 0) {
    throw new Error('amount must be a positive number');
  }
  assertCategoryMatchesKind(input.kind, input.category);

  return prisma.cashFlow.create({
    data: {
      userId,
      kind: input.kind,
      category: input.category,
      amount: input.amount,
      frequency: input.frequency ?? 'Monthly',
      startDate: coerceDate(input.startDate),
      endDate: coerceDate(input.endDate),
      source: input.source?.trim() || null,
      notes: input.notes?.trim() || null,
      inflationAdjusted: input.inflationAdjusted ?? false,
    },
  });
}

/** Update a cash flow; verifies ownership. */
export async function updateCashFlow(
  id: string,
  input: UpdateCashFlowInput,
  userId: string
): Promise<CashFlow> {
  const existing = await findOwned(id, userId);
  if (!existing) throw new Error('cash flow not found or not owned by user');

  const nextKind = input.kind ?? existing.kind;
  const nextCategory = input.category ?? existing.category;
  if (input.kind !== undefined || input.category !== undefined) {
    assertCategoryMatchesKind(nextKind, nextCategory);
  }
  if (input.amount !== undefined && (!isFinite(input.amount) || input.amount <= 0)) {
    throw new Error('amount must be a positive number');
  }

  return prisma.cashFlow.update({
    where: { id },
    data: {
      ...(input.kind !== undefined ? { kind: input.kind } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.amount !== undefined ? { amount: input.amount } : {}),
      ...(input.frequency !== undefined ? { frequency: input.frequency } : {}),
      ...(input.startDate !== undefined ? { startDate: coerceDate(input.startDate) } : {}),
      ...(input.endDate !== undefined ? { endDate: coerceDate(input.endDate) } : {}),
      ...(input.source !== undefined ? { source: input.source?.trim() || null } : {}),
      ...(input.notes !== undefined ? { notes: input.notes?.trim() || null } : {}),
      ...(input.inflationAdjusted !== undefined ? { inflationAdjusted: input.inflationAdjusted } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });
}

/** Delete a cash flow; verifies ownership. */
export async function deleteCashFlow(id: string, userId: string): Promise<void> {
  const existing = await findOwned(id, userId);
  if (!existing) throw new Error('cash flow not found or not owned by user');
  await prisma.cashFlow.delete({ where: { id } });
}

// ---- derived helpers (used by retirement capability later) ----

/** Sum monthly equivalent of all active flows of a kind, optionally as-of a date. */
export async function sumMonthlyByKind(
  userId: string,
  kind: CashFlowKind,
  atDate?: Date | string
): Promise<number> {
  const flows = await listCashFlowsByUser(userId, { kind, atDate });
  return flows.reduce((acc, f) => acc + f.amount * FREQ_PER_MONTH[f.frequency], 0);
}
