// Types for the accounts capability.
// Re-export Prisma's generated AccountType so callers have one source of truth.

import type { Account as PrismaAccount, AccountType as PrismaAccountType, RealEstateDetails as PrismaRealEstateDetails } from '@prisma/client';

export type AccountType = PrismaAccountType;
export const ACCOUNT_TYPES: AccountType[] = [
  'CashBank',
  'TaxableBrokerage',
  'TraditionalRetirement',
  'RothRetirement',
  'HSA',
  'RealEstate',
  'MortgageLoan',
  'Other',
];

// Human-readable labels for UI rendering.
export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  CashBank: 'Cash & Bank',
  TaxableBrokerage: 'Brokerage (Taxable)',
  TraditionalRetirement: 'Traditional Retirement (401(k) / IRA)',
  RothRetirement: 'Roth (Roth 401(k) / Roth IRA)',
  HSA: 'Health Savings Account (HSA)',
  RealEstate: 'Real Estate',
  MortgageLoan: 'Mortgage / Loan',
  Other: 'Other',
};

export type Account = PrismaAccount;
export type RealEstateDetails = PrismaRealEstateDetails;

export type AccountWithRealEstate = Account & { realEstate: RealEstateDetails | null };

export interface CreateAccountInput {
  portfolioId?: string | null;
  accountName: string;
  accountType: AccountType;
  isRetirement?: boolean;
  balance?: number | null;
  currency?: string;
}

export interface UpdateAccountInput {
  portfolioId?: string | null;
  accountName?: string;
  accountType?: AccountType;
  isRetirement?: boolean;
  balance?: number | null;
  currency?: string;
  isActive?: boolean;
}

export interface RealEstateDetailsInput {
  propertyType: 'primary_home' | 'rental' | 'other';
  currentValue: number;
  outstandingLoan?: number | null;
  interestRate?: number | null;
  monthlyPayment?: number | null;
}
