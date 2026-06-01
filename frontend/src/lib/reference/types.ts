// Types for the reference-profile capability (Phase 3.5).
//
// "Reference profiles" are users flagged `isReferenceProfile=true` whose data
// (portfolios, accounts, assets, cashflows, selected profile fields) is exposed
// to other logged-in users on the Templates page. Authored personas only; not
// a sharing primitive for arbitrary users.

import type {
  AccountType,
  AccountWithRealEstate,
} from '@/lib/accounts/types';
import type { CashFlow } from '@/lib/income';

/** Summary suitable for a card on the Templates page. No full holdings. */
export interface ReferenceProfileSummary {
  userId: string;
  firstName: string;
  lastName: string;
  referenceTitle: string;
  referenceDescription: string;
  /** Quick stats so the card can render without a separate query. */
  stats: {
    portfolioCount: number;
    accountCount: number;
    investableBalance: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    /** Will the projection say they're on track at standard inputs? */
    readinessStatus: 'on_track' | 'tight' | 'falling_behind' | 'unknown';
  };
}

/** Detailed shape for the read-only viewer routes. */
export interface ReferenceProfileDetail {
  userId: string;
  firstName: string;
  lastName: string;
  referenceTitle: string;
  referenceDescription: string;
  /** Portfolios with their account+asset structure. Asset price/quantity included. */
  portfolios: Array<{
    id: string;
    name: string;
    description: string | null;
    accounts: AccountWithRealEstate[];
    assets: Array<{
      id: string;
      symbol: string;
      assetType: string;
      quantity: number;
      avgCost: number | null;
      price: number | null;
      accountId: string | null;
    }>;
  }>;
  cashFlows: CashFlow[];
  /** Selected profile fields — what we'd offer to copy in pull-a-profile. */
  profile: {
    birthDate: Date | null;
    monthlyIncome: number | null;
    monthlyFixedExpenses: number | null;
    monthlyMortgage: number | null;
    monthlyRent: number | null;
    emergencyFund: number | null;
    estimatedSocialSecurityAt65: number | null;
    homeValue: number | null;
    totalDebt: number | null;
    riskTolerance: string | null;
    dependents: number | null;
    employmentStatus: string | null;
    housingType: string | null;
    investmentExperience: string | null;
  };
}

/** Sections a user can select when pulling a reference profile into their own. */
export interface CopySections {
  portfolios?: boolean;
  income?: boolean;
  /** Profile fields are only copied where the target user's field is empty. */
  profile?: boolean;
}

/** Result of a copy — counts per section so the UI can show what happened. */
export interface CopyResult {
  copiedPortfolios: number;
  copiedAccounts: number;
  copiedAssets: number;
  copiedCashFlows: number;
  /** How many profile fields were filled (target field was empty, source had value). */
  filledProfileFields: number;
  /** Names of profile fields skipped because the target already had a value. */
  skippedProfileFields: string[];
}

export type { AccountType };
