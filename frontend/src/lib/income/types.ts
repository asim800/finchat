// Types for the income capability.
// Re-exports Prisma's generated enums so callers have one source of truth.

import type {
  CashFlow as PrismaCashFlow,
  CashFlowKind as PrismaCashFlowKind,
  CashFlowCategory as PrismaCashFlowCategory,
  CashFlowFrequency as PrismaCashFlowFrequency,
} from '@prisma/client';

export type CashFlow = PrismaCashFlow;
export type CashFlowKind = PrismaCashFlowKind;
export type CashFlowCategory = PrismaCashFlowCategory;
export type CashFlowFrequency = PrismaCashFlowFrequency;

export const CASH_FLOW_KINDS: CashFlowKind[] = ['Income', 'Expense'];

export const CASH_FLOW_FREQUENCIES: CashFlowFrequency[] = [
  'OneTime', 'Weekly', 'Biweekly', 'Monthly', 'Quarterly', 'Annual',
];

export const INCOME_CATEGORIES: CashFlowCategory[] = [
  'Salary', 'Pension', 'SocialSecurity', 'Annuity', 'RentalIncome', 'DividendInterest', 'OtherIncome',
];

export const EXPENSE_CATEGORIES: CashFlowCategory[] = [
  'Housing', 'Living', 'Healthcare', 'Discretionary', 'Taxes', 'OtherExpense',
];

// Human-readable labels for UI.
export const CASH_FLOW_CATEGORY_LABELS: Record<CashFlowCategory, string> = {
  // Income
  Salary: 'Salary / Wages',
  Pension: 'Pension',
  SocialSecurity: 'Social Security',
  Annuity: 'Annuity',
  RentalIncome: 'Rental Income',
  DividendInterest: 'Dividends / Interest',
  OtherIncome: 'Other Income',
  // Expense
  Housing: 'Housing',
  Living: 'Living (food, utilities, transport)',
  Healthcare: 'Healthcare',
  Discretionary: 'Discretionary (travel, entertainment)',
  Taxes: 'Taxes',
  OtherExpense: 'Other Expense',
};

export const CASH_FLOW_FREQUENCY_LABELS: Record<CashFlowFrequency, string> = {
  OneTime: 'One-time',
  Weekly: 'Weekly',
  Biweekly: 'Biweekly',
  Monthly: 'Monthly',
  Quarterly: 'Quarterly',
  Annual: 'Annual',
};

// Multiplier to normalize any frequency → monthly. Useful for summing.
export const FREQ_PER_MONTH: Record<CashFlowFrequency, number> = {
  OneTime: 0,        // one-time flows don't have a monthly rate
  Weekly: 52 / 12,
  Biweekly: 26 / 12,
  Monthly: 1,
  Quarterly: 1 / 3,
  Annual: 1 / 12,
};

export interface CreateCashFlowInput {
  kind: CashFlowKind;
  category: CashFlowCategory;
  amount: number;
  frequency?: CashFlowFrequency;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  source?: string | null;
  notes?: string | null;
  inflationAdjusted?: boolean;
}

export interface UpdateCashFlowInput {
  kind?: CashFlowKind;
  category?: CashFlowCategory;
  amount?: number;
  frequency?: CashFlowFrequency;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  source?: string | null;
  notes?: string | null;
  inflationAdjusted?: boolean;
  isActive?: boolean;
}
