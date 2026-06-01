// Retirement capability — typed public API (Phase 3).
//
// Composes lib/accounts (typed accounts + RealEstateDetails) + lib/income (CashFlow
// totals + retirement-era flows like SS/pension) + the User profile into a single
// deterministic projection + readiness summary + supporting panels. Page calls one
// endpoint (POST /api/retirement/project) and gets everything for the page in one
// RetirementResult.
//
// v1 internals: pure deterministic year-by-year simulation. No Python, no MC. Phase 4
// will swap simulateDeterministic + computeReadiness internals to call the standalone
// MC service — the public contract here (projectRetirement → RetirementResult) does
// NOT change, so the page won't change either. That's the whole point.

import { prisma } from '@/lib/db';
import {
  listAccountsByUser,
  type AccountType,
  type AccountWithRealEstate,
} from '@/lib/accounts';
import {
  listCashFlowsByUser,
  sumMonthlyByKind,
  FREQ_PER_MONTH,
  type CashFlow,
} from '@/lib/income';
import type {
  RetirementInputs,
  RetirementResult,
  RetirementProjection,
  PathPoint,
  ReadinessSummary,
  ReadinessStatus,
  InputsResolved,
  InputSource,
  InvestableBreakdownRow,
  WhatWeKnow,
  RealEstateWealth,
  AssetMatrix,
  AssetMatrixRow,
} from './types';

export * from './types';

// Internal shape — pre-loaded asset row used by both sumInvestableBalance and
// buildAssetMatrix so we only hit Prisma once.
interface AssetRow {
  accountId: string | null;
  assetType: string;
  quantity: number;
  price: number | null;
}

// ---- public API ----

/**
 * Main entry point. One call returns everything the retirement page needs:
 * projection path + readiness + resolved inputs + gap-fill summary + RE wealth +
 * asset matrix. Intended to be invoked from /api/retirement/project once on page
 * load and on every input change (debounce in the UI).
 */
export async function projectRetirement(
  userId: string,
  inputs: RetirementInputs,
): Promise<RetirementResult> {
  if (!userId) throw new Error('userId required');
  validateInputs(inputs);

  const endOfLifeAge = inputs.endOfLifeAge ?? 95;

  // 1. Gather everything we know about the user (parallel batch).
  // Note: sumMonthlyByKind takes an `atDate` to filter to flows active at that date —
  // pass `today` so future-dated SS/pension don't inflate the user's CURRENT income.
  const today = new Date();
  const [user, accounts, cashflows, monthlyIncomeFromFlows, monthlyExpenseFromFlows] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        birthDate: true, monthlyIncome: true, monthlyFixedExpenses: true,
        estimatedSocialSecurityAt65: true, riskTolerance: true,
      },
    }),
    listAccountsByUser(userId),
    listCashFlowsByUser(userId),
    sumMonthlyByKind(userId, 'Income', today),
    sumMonthlyByKind(userId, 'Expense', today),
  ]);
  if (!user) throw new Error('user not found');

  // 1b. Load all of this user's assets in one query (used by both
  // sumInvestableBalance and buildAssetMatrix below).
  const allAssets: AssetRow[] = await prisma.asset.findMany({
    where: { accountId: { in: accounts.map((a) => a.id) } },
    select: { accountId: true, assetType: true, quantity: true, price: true },
  });

  // 2. Resolve inputs (with source attribution for the UI panel).
  // Phase 3.5: diagnostic overrides take precedence over CashFlow/profile resolution.
  const currentAge = ageFromBirthDate(user.birthDate);
  const ageSource: InputSource = user.birthDate ? 'profile' : 'unknown';

  let monthlyIncome: number;
  let incomeSource: InputSource;
  if (inputs.overrideMonthlyIncome != null) {
    monthlyIncome = inputs.overrideMonthlyIncome;
    incomeSource = 'override';
  } else if (monthlyIncomeFromFlows > 0) {
    monthlyIncome = monthlyIncomeFromFlows;
    incomeSource = 'cashflow';
  } else if (user.monthlyIncome && user.monthlyIncome > 0) {
    monthlyIncome = user.monthlyIncome;
    incomeSource = 'profile';
  } else {
    monthlyIncome = 0;
    incomeSource = 'unknown';
  }

  let monthlyExpenses: number;
  let expenseSource: InputSource;
  if (inputs.overrideMonthlyExpenses != null) {
    monthlyExpenses = inputs.overrideMonthlyExpenses;
    expenseSource = 'override';
  } else if (monthlyExpenseFromFlows > 0) {
    monthlyExpenses = monthlyExpenseFromFlows;
    expenseSource = 'cashflow';
  } else if (user.monthlyFixedExpenses && user.monthlyFixedExpenses > 0) {
    monthlyExpenses = user.monthlyFixedExpenses;
    expenseSource = 'profile';
  } else {
    monthlyExpenses = 0;
    expenseSource = 'unknown';
  }

  const expectedReturn = expectedReturnFor(user.riskTolerance);
  const { total: investableBalance, breakdown: investableBreakdownRaw } =
    sumInvestableBalanceWithBreakdown(accounts, allAssets);

  // Resolve portfolio names for the breakdown (one small query — referenced only by
  // the diagnostic page; cheap enough to always include).
  const portfolioIds = Array.from(new Set(accounts.map((a) => a.portfolioId).filter(Boolean) as string[]));
  const portfolioNameById = new Map<string, string>();
  if (portfolioIds.length > 0) {
    const portfolioRows = await prisma.portfolio.findMany({
      where: { id: { in: portfolioIds } },
      select: { id: true, name: true },
    });
    for (const p of portfolioRows) portfolioNameById.set(p.id, p.name);
  }
  const accountToPortfolioName = new Map<string, string>();
  for (const acc of accounts) {
    if (acc.portfolioId) accountToPortfolioName.set(acc.id, portfolioNameById.get(acc.portfolioId) ?? '');
  }
  const investableBreakdown: InvestableBreakdownRow[] = investableBreakdownRaw.map((row) => ({
    ...row,
    portfolioName: accountToPortfolioName.get(row.accountId) ?? '',
  }));

  // 3. Retirement-era income flows (SS, pension, rental, annuity) active at retirement.
  // Phase 3.5: if `includeSocialSecurity === false`, exclude BOTH the CashFlow SS rows
  // AND the User.estimatedSocialSecurityAt65 fallback. Pension / Annuity / RentalIncome
  // are still counted.
  const includeSS = inputs.includeSocialSecurity ?? true;
  let monthlyRetirementIncomeAtRetire = sumRetirementIncomeAtAge(
    cashflows,
    inputs.retirementAge,
    currentAge ?? 0,
    includeSS,
  );
  const hasCashFlowSS = cashflows.some(
    (cf) => cf.kind === 'Income' && cf.category === 'SocialSecurity' && cf.isActive,
  );
  if (includeSS && !hasCashFlowSS && user.estimatedSocialSecurityAt65 && inputs.retirementAge >= 65) {
    monthlyRetirementIncomeAtRetire += user.estimatedSocialSecurityAt65;
  }

  const inputsResolved: InputsResolved = {
    currentAge,
    monthlyIncome,
    monthlyExpenses,
    monthlyRetirementIncomeAtRetire,
    investableBalance,
    investableBreakdown,
    expectedReturn,
    sources: { age: ageSource, income: incomeSource, expenses: expenseSource },
  };

  // 4. Simulate three deterministic paths (low / expected / high return).
  const assumedReturnBand = 0.02;
  const simStart = currentAge ?? 30;
  const monthlyContribution = Math.max(0, monthlyIncome - monthlyExpenses);
  const simCommon = {
    startAge: simStart,
    startBalance: investableBalance,
    retirementAge: inputs.retirementAge,
    endOfLifeAge,
    monthlyContribution,
    monthlyTarget: inputs.targetMonthlySpending,
    monthlyRetirementIncomeAtRetire,
  };
  const expected = simulate({ ...simCommon, annualReturn: expectedReturn });
  const low      = simulate({ ...simCommon, annualReturn: expectedReturn - assumedReturnBand });
  const high     = simulate({ ...simCommon, annualReturn: expectedReturn + assumedReturnBand });

  const path: PathPoint[] = expected.path.map((p, i) => ({
    age: p.age,
    expected: p.balance,
    low: low.path[i].balance,
    high: high.path[i].balance,
  }));

  const projection: RetirementProjection = {
    path,
    retirementAge: inputs.retirementAge,
    endOfLifeAge,
    expectedReturn,
    assumedReturnBand,
  };

  // 5. Readiness derived from the EXPECTED path (the headline number).
  const readiness = computeReadiness(expected.moneyRunsOutAge, endOfLifeAge);

  // 6. What we know panel signals.
  const whatWeKnow: WhatWeKnow = {
    hasBirthDate: !!user.birthDate,
    hasIncome: incomeSource !== 'unknown',
    hasExpenses: expenseSource !== 'unknown',
    hasSocialSecurity: (user.estimatedSocialSecurityAt65 ?? 0) > 0,
    hasRiskTolerance: !!user.riskTolerance,
    hasInvestableAssets: investableBalance > 0,
  };

  // 7. Real-estate wealth (separate bucket).
  const realEstate = computeRealEstateWealth(accounts);

  // 8. Asset matrix (cross-tab account-type × asset-type).
  const matrix = buildAssetMatrix(accounts, allAssets);

  return { projection, readiness, inputsResolved, whatWeKnow, realEstate, matrix };
}

// ---- internal helpers ----

function validateInputs(input: RetirementInputs): void {
  if (typeof input.retirementAge !== 'number' || input.retirementAge < 30 || input.retirementAge > 90) {
    throw new Error('retirementAge must be a number between 30 and 90');
  }
  if (typeof input.targetMonthlySpending !== 'number' || input.targetMonthlySpending < 0) {
    throw new Error('targetMonthlySpending must be a non-negative number');
  }
  if (input.endOfLifeAge !== undefined) {
    if (input.endOfLifeAge < input.retirementAge || input.endOfLifeAge > 110) {
      throw new Error('endOfLifeAge must be between retirementAge and 110');
    }
  }
}

function ageFromBirthDate(birthDate: Date | null): number | null {
  if (!birthDate) return null;
  const ms = Date.now() - birthDate.getTime();
  return Math.floor(ms / (365.25 * 24 * 60 * 60 * 1000));
}

/**
 * Expected REAL return (above inflation) by risk tolerance. We project balances in
 * today's-dollars to match the "today's purchasing power" framing of the headline
 * readiness number. Using nominal returns (~5/7/9%) with today's-$ labels would
 * silently overstate growth by ~2%/yr — over a 56-year horizon that's a 3× error
 * in the displayed final balance. Real returns avoid that.
 *
 * Rough basis: long-run real returns are ~7% (US equities), ~2% (US bonds). The
 * tolerance-tiered numbers reflect a typical glide-path mix at each posture.
 */
function expectedReturnFor(riskTolerance: string | null): number {
  switch ((riskTolerance ?? '').toLowerCase()) {
    case 'conservative': return 0.03;
    case 'aggressive':
    case 'moderate-aggressive': return 0.07;
    case 'moderate':
    default: return 0.05;
  }
}

/**
 * Sum investable balance across non-RE, non-Mortgage accounts, AND return a
 * per-account breakdown (Phase 3.5 — used by the retirement diagnostic page so
 * the user can cross-check the projection's investable figure against the
 * Portfolio page values).
 *
 * For each account: prefer sum of its assets' market values (qty × current price);
 * fall back to `account.balance` when the account has no priced assets (Cash & Bank,
 * HSA-as-cash). Assets without a price contribute 0 — we don't double-fall-back to
 * avgCost because that's a cost basis, not a value, and would inflate readiness.
 */
function sumInvestableBalanceWithBreakdown(
  accounts: AccountWithRealEstate[],
  assets: AssetRow[],
): { total: number; breakdown: InvestableBreakdownRow[] } {
  const investable = accounts.filter(
    (a) => a.accountType !== 'RealEstate' && a.accountType !== 'MortgageLoan',
  );

  // Sum asset values per account.
  const valueByAccount = new Map<string, number>();
  for (const a of assets) {
    if (!a.accountId || a.price == null) continue;
    valueByAccount.set(
      a.accountId,
      (valueByAccount.get(a.accountId) ?? 0) + a.quantity * a.price,
    );
  }

  // Build per-account rows + total. To populate `portfolioName` we need the
  // portfolio map — fetch them here (single small query; accounts know their portfolioId).
  // Note: keeping this in-memory: callers pass accounts already loaded; we map name from
  // accounts[].portfolioId via a one-shot DB lookup below if needed. For now, populate
  // portfolioName lazily — most callers (the diagnostic page) will live with portfolioId
  // if the lookup is too costly. To stay synchronous, we fall back to the portfolioId as
  // the portfolioName when we can't resolve it (rare; reference profiles always have a name).
  const breakdown: InvestableBreakdownRow[] = [];
  let total = 0;
  for (const acc of investable) {
    const assetValue = valueByAccount.get(acc.id);
    let value: number;
    let source: 'assets' | 'balance';
    if (assetValue && assetValue > 0) {
      value = assetValue;
      source = 'assets';
    } else if (acc.balance != null) {
      value = acc.balance;
      source = 'balance';
    } else {
      continue; // no contribution
    }
    total += value;
    breakdown.push({
      accountId: acc.id,
      accountName: acc.accountName,
      accountType: acc.accountType,
      // portfolioName resolved by caller (it has the portfolio list); leave as empty
      // string here. We don't make this fn async to keep simulate-stage perf simple.
      portfolioName: '',
      value,
      source,
    });
  }

  return { total, breakdown };
}

function computeRealEstateWealth(accounts: AccountWithRealEstate[]): RealEstateWealth {
  const reAccounts = accounts.filter(
    (a) => a.accountType === 'RealEstate' && a.realEstate,
  );
  let totalValue = 0;
  let totalLoan = 0;
  const properties = reAccounts.map((a) => {
    const value = a.realEstate!.currentValue;
    const loan = a.realEstate!.outstandingLoan ?? 0;
    totalValue += value;
    totalLoan += loan;
    return {
      name: a.accountName,
      propertyType: a.realEstate!.propertyType,
      value,
      loan,
      equity: value - loan,
    };
  });
  return { totalValue, totalLoan, netEquity: totalValue - totalLoan, properties };
}

/**
 * Sum the monthly equivalent of retirement-era income flows (SS, Pension, Annuity,
 * RentalIncome) that will be active when the user reaches retirementAge.
 * Phase 3.5: pass `includeSS=false` to exclude SocialSecurity CashFlow rows.
 */
function sumRetirementIncomeAtAge(
  cashflows: CashFlow[],
  retirementAge: number,
  currentAge: number,
  includeSS: boolean,
): number {
  const yearsTilRetire = Math.max(0, retirementAge - currentAge);
  const retireDate = new Date();
  retireDate.setFullYear(retireDate.getFullYear() + yearsTilRetire);

  const RETIREMENT_INCOME_CATEGORIES = new Set([
    'SocialSecurity', 'Pension', 'Annuity', 'RentalIncome',
  ]);

  let monthlyTotal = 0;
  for (const cf of cashflows) {
    if (cf.kind !== 'Income') continue;
    if (!RETIREMENT_INCOME_CATEGORIES.has(cf.category)) continue;
    if (!includeSS && cf.category === 'SocialSecurity') continue;
    if (!cf.isActive) continue;
    if (cf.startDate && cf.startDate > retireDate) continue;
    if (cf.endDate && cf.endDate < retireDate) continue;
    const multiplier = FREQ_PER_MONTH[cf.frequency] ?? 1;
    monthlyTotal += cf.amount * multiplier;
  }
  return monthlyTotal;
}

// ---- the simulation core (pure function; deterministic) ----

interface SimOpts {
  startAge: number;
  startBalance: number;
  retirementAge: number;
  endOfLifeAge: number;
  monthlyContribution: number;
  monthlyTarget: number;
  monthlyRetirementIncomeAtRetire: number;
  annualReturn: number;
}

interface SimResult {
  path: { age: number; balance: number }[];
  moneyRunsOutAge: number | null;
}

function simulate(opts: SimOpts): SimResult {
  const path: { age: number; balance: number }[] = [];
  let balance = opts.startBalance;
  let moneyRunsOutAge: number | null = null;

  for (let age = opts.startAge; age <= opts.endOfLifeAge; age++) {
    if (age < opts.retirementAge) {
      balance += opts.monthlyContribution * 12;
    } else {
      const annualTarget = opts.monthlyTarget * 12;
      const annualRetIncome = opts.monthlyRetirementIncomeAtRetire * 12;
      const withdrawal = Math.max(0, annualTarget - annualRetIncome);
      balance -= withdrawal;
      if (balance < 0 && moneyRunsOutAge === null) {
        moneyRunsOutAge = age;
        balance = 0;
      }
    }
    if (balance > 0) {
      balance *= 1 + opts.annualReturn;
    }
    path.push({ age, balance: Math.round(balance) });
  }
  return { path, moneyRunsOutAge };
}

function computeReadiness(moneyRunsOutAge: number | null, endOfLifeAge: number): ReadinessSummary {
  if (moneyRunsOutAge === null) {
    return { lastsToAge: endOfLifeAge, moneyRunsOut: false, status: 'on_track' };
  }
  const status: ReadinessStatus = moneyRunsOutAge >= 85 ? 'tight' : 'falling_behind';
  return { lastsToAge: moneyRunsOutAge, moneyRunsOut: true, status };
}

// ---- asset matrix (cross-tab account-type × asset-type) ----

/**
 * Build a cross-tab of $ value by accountType × assetType.
 * - Investable accounts contribute one cell per asset (assetType column).
 * - Real Estate accounts contribute a 'property' cell with currentValue.
 * - Mortgage accounts contribute a 'debt' cell with their (negative) balance.
 *
 * Mortgage debt is shown in the matrix for transparency but NOT subtracted from
 * RE equity again (that's already done by RealEstateDetails.outstandingLoan).
 */
function buildAssetMatrix(
  accounts: AccountWithRealEstate[],
  assets: AssetRow[],
): AssetMatrix {
  const rowByType = new Map<AccountType, AssetMatrixRow>();
  const columnsOrdered: string[] = [];
  const colTotals: Record<string, number> = {};

  const addToRow = (accountType: AccountType, col: string, amount: number) => {
    let row = rowByType.get(accountType);
    if (!row) {
      row = { accountType, byAssetType: {}, total: 0 };
      rowByType.set(accountType, row);
    }
    row.byAssetType[col] = (row.byAssetType[col] ?? 0) + amount;
    row.total += amount;
    colTotals[col] = (colTotals[col] ?? 0) + amount;
    if (!columnsOrdered.includes(col)) columnsOrdered.push(col);
  };

  const accountById = new Map(accounts.map((a) => [a.id, a]));

  // Investable assets by accountType × assetType.
  for (const a of assets) {
    if (!a.accountId || a.price == null) continue;
    const acc = accountById.get(a.accountId);
    if (!acc) continue;
    if (acc.accountType === 'RealEstate' || acc.accountType === 'MortgageLoan') continue;
    const value = a.quantity * a.price;
    if (value === 0) continue;
    addToRow(acc.accountType, a.assetType, value);
  }

  // Real estate + mortgage rows (synthetic columns).
  for (const acc of accounts) {
    if (acc.accountType === 'RealEstate' && acc.realEstate) {
      addToRow('RealEstate', 'property', acc.realEstate.currentValue);
    }
    if (acc.accountType === 'MortgageLoan' && acc.balance != null) {
      addToRow('MortgageLoan', 'debt', acc.balance);
    }
  }

  const rows = Array.from(rowByType.values());
  const grandTotal = rows.reduce((s, r) => s + r.total, 0);
  return { rows, columns: columnsOrdered, colTotals, grandTotal };
}
