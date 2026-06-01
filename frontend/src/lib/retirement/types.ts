// Types for the retirement capability (Phase 3). One result shape per page round-trip.
//
// All numbers are in USD (today's dollars; no inflation modeling in v1).
// All ages are integers.

import type { AccountType } from '@/lib/accounts/types';

// ---- inputs (page-controlled, ephemeral; no persistence in v1) ----

export interface RetirementInputs {
  /** Age at which contributions stop and withdrawals begin. */
  retirementAge: number;
  /** Target monthly spending in retirement, in today's dollars. */
  targetMonthlySpending: number;
  /** Horizon end. Defaults to 95 inside the capability if omitted. */
  endOfLifeAge?: number;
}

// ---- projection output ----

/**
 * One year's data point. `expected` is the central deterministic projection;
 * `low` / `high` are the same path computed with ±2% return for the visualization band.
 * All three are end-of-year balances in today's dollars.
 */
export interface PathPoint {
  age: number;
  expected: number;
  low: number;
  high: number;
}

export interface RetirementProjection {
  path: PathPoint[];
  retirementAge: number;
  endOfLifeAge: number;
  /** Annual return assumption for the central path (e.g. 0.07 = 7%). */
  expectedReturn: number;
  /** ±width applied to expectedReturn for low/high bands (e.g. 0.02). */
  assumedReturnBand: number;
}

export type ReadinessStatus = 'on_track' | 'tight' | 'falling_behind';

export interface ReadinessSummary {
  /** Age at which money runs out, or endOfLifeAge if it never does. */
  lastsToAge: number;
  /** Whether the balance actually hit zero before endOfLifeAge. */
  moneyRunsOut: boolean;
  status: ReadinessStatus;
}

// ---- what we know about you (gap-fill panel) ----

/**
 * Where a resolved input came from. `cashflow` = derived from CashFlow rows;
 * `profile` = User.monthlyIncome / monthlyFixedExpenses fallback; `unknown` = neither.
 */
export type InputSource = 'cashflow' | 'profile' | 'unknown';

export interface InputsResolved {
  currentAge: number | null; // null if no birthDate
  monthlyIncome: number;
  monthlyExpenses: number;
  /** Sum of monthly retirement-income flows active at the retirement age (SS, pension, rental). */
  monthlyRetirementIncomeAtRetire: number;
  investableBalance: number;
  expectedReturn: number;
  /** Source attribution for the resolved values; UI surfaces "where this came from". */
  sources: {
    age: InputSource;
    income: InputSource;
    expenses: InputSource;
  };
}

export interface WhatWeKnow {
  hasBirthDate: boolean;
  hasIncome: boolean;
  hasExpenses: boolean;
  hasSocialSecurity: boolean;
  hasRiskTolerance: boolean;
  hasInvestableAssets: boolean;
}

// ---- real estate (excluded from projection; shown separately) ----

export interface RealEstateProperty {
  name: string;
  propertyType: string; // 'primary_home' | 'rental' | 'other'
  value: number;
  loan: number;
  equity: number;
}

export interface RealEstateWealth {
  totalValue: number;
  totalLoan: number;
  netEquity: number;
  properties: RealEstateProperty[];
}

// ---- asset matrix (cross-tab account type × asset type) ----

export interface AssetMatrixRow {
  accountType: AccountType;
  /** $ values keyed by asset-type string (e.g. 'stock', 'etf'); plus 'property' and 'debt' synthetics. */
  byAssetType: Record<string, number>;
  total: number;
}

export interface AssetMatrix {
  rows: AssetMatrixRow[];
  /** All asset-type column keys present across all rows (preserves first-seen order). */
  columns: string[];
  colTotals: Record<string, number>;
  grandTotal: number;
}

// ---- top-level result (one HTTP round-trip) ----

export interface RetirementResult {
  projection: RetirementProjection;
  readiness: ReadinessSummary;
  inputsResolved: InputsResolved;
  whatWeKnow: WhatWeKnow;
  realEstate: RealEstateWealth;
  matrix: AssetMatrix;
}
