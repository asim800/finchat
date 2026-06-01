// Reference-profile capability (Phase 3.5). Composes lib/accounts + lib/income +
// direct Prisma (for Portfolio + Asset creation) to provide:
// (HMR nudge so the dev server picks up the regenerated Prisma client.)
//   - listReferenceProfiles  (Templates page summary cards)
//   - getReferenceProfile    (read-only viewer routes)
//   - copyReferenceSections  (pull-a-profile flow, Package B)
//
// Auth scope: callers must verify the requester is logged in (Templates,
// viewers, and copy endpoints are all behind auth). This module trusts callers
// — it does NOT itself enforce auth, but it DOES enforce that the source user
// is actually flagged isReferenceProfile=true on every call. That's the only
// door — non-reference users never leak through.

import { prisma } from '@/lib/db';
import { listAccountsByUser, type AccountWithRealEstate } from '@/lib/accounts';
import {
  listCashFlowsByUser,
  sumMonthlyByKind,
  createCashFlow,
  type CashFlow,
} from '@/lib/income';
import { projectRetirement } from '@/lib/retirement';
import type {
  ReferenceProfileSummary,
  ReferenceProfileDetail,
  CopySections,
  CopyResult,
} from './types';

export * from './types';

// ---- public API ----

/**
 * Return summary cards for every user flagged as a reference profile.
 * Used by the Templates page (logged-in users only — caller enforces auth).
 */
export async function listReferenceProfiles(): Promise<ReferenceProfileSummary[]> {
  const users = await prisma.user.findMany({
    where: { isReferenceProfile: true },
    orderBy: { createdAt: 'asc' },
  });
  return Promise.all(users.map((u) => buildSummary(u.id, u.firstName, u.lastName, u.referenceTitle, u.referenceDescription)));
}

/**
 * Full read-only detail for a single reference user. Returns null if not
 * found OR not flagged as a reference profile — callers should 404.
 */
export async function getReferenceProfile(userId: string): Promise<ReferenceProfileDetail | null> {
  if (!userId) return null;
  const user = await prisma.user.findFirst({
    where: { id: userId, isReferenceProfile: true },
  });
  if (!user) return null;

  const [portfolios, accounts, cashFlows] = await Promise.all([
    prisma.portfolio.findMany({
      where: { userId },
      include: { assets: { select: { id: true, symbol: true, assetType: true, quantity: true, avgCost: true, price: true, accountId: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    listAccountsByUser(userId),
    listCashFlowsByUser(userId),
  ]);

  // Pair each portfolio with its accounts (filtered from the flat account list).
  const accountsByPortfolio = new Map<string, AccountWithRealEstate[]>();
  for (const acc of accounts) {
    if (!acc.portfolioId) continue;
    const arr = accountsByPortfolio.get(acc.portfolioId) ?? [];
    arr.push(acc);
    accountsByPortfolio.set(acc.portfolioId, arr);
  }

  return {
    userId: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    referenceTitle: user.referenceTitle ?? '',
    referenceDescription: user.referenceDescription ?? '',
    portfolios: portfolios.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      accounts: accountsByPortfolio.get(p.id) ?? [],
      assets: p.assets,
    })),
    cashFlows,
    profile: {
      birthDate: user.birthDate,
      monthlyIncome: user.monthlyIncome,
      monthlyFixedExpenses: user.monthlyFixedExpenses,
      monthlyMortgage: user.monthlyMortgage,
      monthlyRent: user.monthlyRent,
      emergencyFund: user.emergencyFund,
      estimatedSocialSecurityAt65: user.estimatedSocialSecurityAt65,
      homeValue: user.homeValue,
      totalDebt: user.totalDebt,
      riskTolerance: user.riskTolerance,
      dependents: user.dependents,
      employmentStatus: user.employmentStatus,
      housingType: user.housingType,
      investmentExperience: user.investmentExperience,
    },
  };
}

/**
 * Copy selected sections of a reference profile into a target user's account.
 * Granular (per-section) and additive (never destroys existing data).
 *
 * Source user must be `isReferenceProfile=true` — enforced here as the only door.
 * Target user must already exist.
 */
export async function copyReferenceSections(
  sourceUserId: string,
  targetUserId: string,
  sections: CopySections,
): Promise<CopyResult> {
  if (!sourceUserId || !targetUserId) throw new Error('source and target user IDs required');
  if (sourceUserId === targetUserId) throw new Error('source and target users must differ');

  // Hard gate: source must be a reference profile.
  const source = await prisma.user.findFirst({
    where: { id: sourceUserId, isReferenceProfile: true },
  });
  if (!source) throw new Error('source is not a reference profile');

  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target) throw new Error('target user not found');

  const result: CopyResult = {
    copiedPortfolios: 0,
    copiedAccounts: 0,
    copiedAssets: 0,
    copiedCashFlows: 0,
    filledProfileFields: 0,
    skippedProfileFields: [],
  };

  // --- portfolios + accounts + assets ---
  if (sections.portfolios) {
    const sourcePortfolios = await prisma.portfolio.findMany({
      where: { userId: sourceUserId },
      include: { assets: true },
      orderBy: { createdAt: 'asc' },
    });
    const sourceAccounts = await listAccountsByUser(sourceUserId);

    // Suffix that makes the imported portfolios identifiable.
    const suffix = ` (from ${source.firstName} ${source.lastName})`;

    for (const srcPortfolio of sourcePortfolios) {
      // Create the destination Portfolio (direct Prisma — we skip lib/portfolio-service's
      // auto-default-Other-account, since we're going to recreate the accounts ourselves).
      const newPortfolio = await prisma.portfolio.create({
        data: {
          userId: targetUserId,
          name: `${srcPortfolio.name}${suffix}`,
          description: srcPortfolio.description,
        },
      });
      result.copiedPortfolios++;

      // Recreate accounts for this portfolio.
      const portfolioAccounts = sourceAccounts.filter((a) => a.portfolioId === srcPortfolio.id);
      const accountIdMap = new Map<string, string>(); // old -> new
      for (const srcAccount of portfolioAccounts) {
        const newAccount = await prisma.account.create({
          data: {
            userId: targetUserId,
            portfolioId: newPortfolio.id,
            accountName: srcAccount.accountName,
            accountType: srcAccount.accountType,
            isRetirement: srcAccount.isRetirement,
            balance: srcAccount.balance,
            currency: srcAccount.currency,
          },
        });
        accountIdMap.set(srcAccount.id, newAccount.id);
        result.copiedAccounts++;

        // RealEstate details if present.
        if (srcAccount.accountType === 'RealEstate' && srcAccount.realEstate) {
          await prisma.realEstateDetails.create({
            data: {
              accountId: newAccount.id,
              propertyType: srcAccount.realEstate.propertyType,
              currentValue: srcAccount.realEstate.currentValue,
              outstandingLoan: srcAccount.realEstate.outstandingLoan,
              interestRate: srcAccount.realEstate.interestRate,
              monthlyPayment: srcAccount.realEstate.monthlyPayment,
            },
          });
        }
      }

      // Recreate assets, remapping accountId via the map.
      if (srcPortfolio.assets.length > 0) {
        await prisma.asset.createMany({
          data: srcPortfolio.assets.map((a) => ({
            portfolioId: newPortfolio.id,
            accountId: a.accountId ? accountIdMap.get(a.accountId) ?? null : null,
            symbol: a.symbol,
            assetType: a.assetType,
            quantity: a.quantity,
            avgCost: a.avgCost,
            price: a.price,
            purchaseDate: a.purchaseDate,
            optionType: a.optionType,
            strikePrice: a.strikePrice,
            expirationDate: a.expirationDate,
          })),
        });
        result.copiedAssets += srcPortfolio.assets.length;
      }
    }
  }

  // --- income / expense cash flows ---
  if (sections.income) {
    const sourceCashFlows = await listCashFlowsByUser(sourceUserId);
    for (const cf of sourceCashFlows) {
      await createCashFlow(
        {
          kind: cf.kind,
          category: cf.category,
          amount: cf.amount,
          frequency: cf.frequency,
          source: cf.source,
          notes: cf.notes,
          startDate: cf.startDate,
          endDate: cf.endDate,
          inflationAdjusted: cf.inflationAdjusted,
        },
        targetUserId,
      );
      result.copiedCashFlows++;
    }
  }

  // --- profile fields (additive: only fill what's empty on the target) ---
  if (sections.profile) {
    const fields = [
      'birthDate', 'monthlyIncome', 'monthlyFixedExpenses', 'monthlyMortgage',
      'monthlyRent', 'emergencyFund', 'estimatedSocialSecurityAt65', 'homeValue',
      'totalDebt', 'riskTolerance', 'dependents', 'employmentStatus',
      'housingType', 'investmentExperience', 'investmentGoals',
    ] as const;

    const updateData: Record<string, unknown> = {};
    for (const f of fields) {
      const srcVal = (source as Record<string, unknown>)[f];
      const tgtVal = (target as Record<string, unknown>)[f];
      const tgtEmpty = tgtVal == null || tgtVal === '';
      if (srcVal != null && srcVal !== '' && tgtEmpty) {
        updateData[f] = srcVal;
        result.filledProfileFields++;
      } else if (srcVal != null && srcVal !== '' && !tgtEmpty) {
        result.skippedProfileFields.push(f);
      }
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({ where: { id: targetUserId }, data: updateData });
    }
  }

  return result;
}

// ---- internal helpers ----

async function buildSummary(
  userId: string,
  firstName: string,
  lastName: string,
  referenceTitle: string | null,
  referenceDescription: string | null,
): Promise<ReferenceProfileSummary> {
  // Pull what we need in parallel.
  const [accounts, monthlyIncome, monthlyExpenses, portfolioCount] = await Promise.all([
    listAccountsByUser(userId),
    sumMonthlyByKind(userId, 'Income', new Date()),
    sumMonthlyByKind(userId, 'Expense', new Date()),
    prisma.portfolio.count({ where: { userId } }),
  ]);

  // Investable balance via the retirement projection (deterministic + cheap).
  // Use generous defaults so it doesn't fail; result is used for sortable summary only.
  let investableBalance = 0;
  let readinessStatus: ReferenceProfileSummary['stats']['readinessStatus'] = 'unknown';
  try {
    const targetSpend = Math.max(2000, Math.round((monthlyExpenses * 0.8) / 100) * 100);
    const projection = await projectRetirement(userId, {
      retirementAge: 65,
      targetMonthlySpending: targetSpend,
    });
    investableBalance = projection.inputsResolved.investableBalance;
    readinessStatus = projection.readiness.status;
  } catch {
    // If projection fails (e.g. no birthDate), still return the card.
  }

  return {
    userId,
    firstName,
    lastName,
    referenceTitle: referenceTitle ?? '',
    referenceDescription: referenceDescription ?? '',
    stats: {
      portfolioCount,
      accountCount: accounts.length,
      investableBalance,
      monthlyIncome,
      monthlyExpenses,
      readinessStatus,
    },
  };
}

// Re-export the CashFlow type for any consumers that need it.
export type { CashFlow };
