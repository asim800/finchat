// Seed three demo users (John Doe, Jane Doe, Jack & Jill) with realistic profile,
// portfolio (Phase 2 accounts), and income/expense data. One-off review aid for
// Phase 0-2; safe to re-run (idempotent — deletes any existing user with the same
// email first, FK cascades clean up portfolios/accounts/assets/cashflows).
//
// Run: `npm run seed:demo` (from frontend/) or `npx tsx scripts/seed-demo-users.ts`.
//
// Why hybrid Prisma + capabilities:
//   - Direct Prisma for User / Portfolio / Asset (need deterministic field control and
//     to skip Phase 2's auto-default-Other-account in createPortfolio).
//   - Capabilities for Account / RealEstateDetails / CashFlow (use lib/accounts +
//     lib/income public APIs → validation runs and the contracts get smoke-tested as
//     a side effect).

import { prisma } from '../src/lib/db';
import { hashPassword } from '../src/lib/auth';
import { createAccount, upsertRealEstateDetails } from '../src/lib/accounts';
import { createCashFlow } from '../src/lib/income';
import type { AccountType } from '../src/lib/accounts/types';
import type { CashFlowCategory, CashFlowKind, CashFlowFrequency } from '@prisma/client';

// Guardrail: never run against production.
if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to run seed:demo with NODE_ENV=production.');
  process.exit(1);
}

// ---- shape helpers (just for static type checking of literal data) ----

interface AssetSeed {
  symbol: string;
  quantity: number;
  avgCost: number;
  price: number;
  assetType?: string;
}

interface AccountSeed {
  accountName: string;
  accountType: AccountType;
  isRetirement?: boolean;
  balance?: number | null;
  assets?: AssetSeed[];
  realEstate?: {
    propertyType: 'primary_home' | 'rental' | 'other';
    currentValue: number;
    outstandingLoan?: number | null;
    interestRate?: number | null;
    monthlyPayment?: number | null;
  };
}

interface PortfolioSeed {
  name: string;
  description?: string;
  accounts: AccountSeed[];
}

interface CashFlowSeed {
  kind: CashFlowKind;
  category: CashFlowCategory;
  amount: number;
  frequency?: CashFlowFrequency;
  source?: string;
  notes?: string;
  startDate?: Date;
  endDate?: Date;
  inflationAdjusted?: boolean;
}

interface UserProfile {
  monthlyIncome?: number;
  monthlyFixedExpenses?: number;
  monthlyMortgage?: number;
  monthlyRent?: number;
  monthlyAlimony?: number;
  emergencyFund?: number;
  estimatedSocialSecurityAt65?: number | null;
  homeValue?: number;
  totalDebt?: number;
  riskTolerance?: string;
  dependents?: number;
  employmentStatus?: string;
  housingType?: string;
  investmentExperience?: string;
  investmentGoals?: string;
}

interface PersonaSeed {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  birthDate: Date;
  city?: string;
  state?: string;
  /** Phase 3.5: marks user as a public reference profile + display blurb. */
  referenceTitle: string;
  referenceDescription: string;
  profile: UserProfile;
  portfolios: PortfolioSeed[];
  cashFlows: CashFlowSeed[];
}

// ---- the three personas ----

const PERSONAS: PersonaSeed[] = [
  // John Doe — single, mid-career, urban renter. Simplest case.
  {
    email: 'johndoe@mystocks.ai',
    password: 'abcdab',
    firstName: 'John',
    lastName: 'Doe',
    birthDate: new Date('1986-04-12'),
    city: 'New York',
    state: 'NY',
    referenceTitle: 'Single, mid-career, urban renter',
    referenceDescription:
      'A 40-year-old single professional renting in NYC. Simple Roth IRA + Taxable brokerage setup at Fidelity. Moderate-aggressive risk tolerance, no real estate.',
    profile: {
      monthlyIncome: 10000,
      monthlyRent: 2500,
      monthlyFixedExpenses: 3500,
      emergencyFund: 25000,
      estimatedSocialSecurityAt65: 2800,
      riskTolerance: 'moderate-aggressive',
      dependents: 0,
      employmentStatus: 'employed',
      housingType: 'rent',
      investmentExperience: 'intermediate',
    },
    portfolios: [
      {
        name: 'Fidelity',
        description: 'Brokerage and retirement at Fidelity',
        accounts: [
          {
            accountName: 'Fidelity Roth IRA',
            accountType: 'RothRetirement',
            isRetirement: true,
            balance: 45000,
            assets: [
              { symbol: 'VTI', quantity: 100, avgCost: 220, price: 245, assetType: 'etf' },
              { symbol: 'VXUS', quantity: 200, avgCost: 55, price: 58, assetType: 'etf' },
            ],
          },
          {
            accountName: 'Fidelity Brokerage',
            accountType: 'TaxableBrokerage',
            balance: 82000,
            assets: [
              { symbol: 'AAPL', quantity: 50, avgCost: 150, price: 185, assetType: 'stock' },
              { symbol: 'MSFT', quantity: 40, avgCost: 280, price: 410, assetType: 'stock' },
              { symbol: 'NVDA', quantity: 30, avgCost: 450, price: 720, assetType: 'stock' },
            ],
          },
        ],
      },
    ],
    cashFlows: [
      { kind: 'Income', category: 'Salary', amount: 10000, source: 'Day job', inflationAdjusted: true },
      { kind: 'Expense', category: 'Housing', amount: 2500, source: 'Rent' },
      { kind: 'Expense', category: 'Living', amount: 1800 },
      { kind: 'Expense', category: 'Healthcare', amount: 350 },
      { kind: 'Expense', category: 'Discretionary', amount: 1200 },
    ],
  },

  // Jane Doe — near retirement, multiple brokerages, primary home + mortgage.
  {
    email: 'janedoe@mystocks.ai',
    password: 'abcdab',
    firstName: 'Jane',
    lastName: 'Doe',
    birthDate: new Date('1968-09-23'),
    city: 'Boston',
    state: 'MA',
    referenceTitle: 'Near-retirement, multi-portfolio, homeowner',
    referenceDescription:
      'A 58-year-old married professional eight years from retirement. Holdings split across Vanguard (Traditional 401(k), Taxable) and Schwab (Roth IRA, HSA), plus a primary home + mortgage. Future pension + SS modeled as CashFlow.',
    profile: {
      monthlyIncome: 15000,
      monthlyMortgage: 3200,
      monthlyFixedExpenses: 5500,
      emergencyFund: 75000,
      estimatedSocialSecurityAt65: 3200,
      homeValue: 850000,
      totalDebt: 420000,
      riskTolerance: 'moderate',
      dependents: 0,
      employmentStatus: 'employed',
      housingType: 'own',
      investmentExperience: 'advanced',
    },
    portfolios: [
      {
        name: 'Vanguard',
        accounts: [
          {
            accountName: 'Vanguard Traditional 401(k)',
            accountType: 'TraditionalRetirement',
            isRetirement: true,
            balance: 620000,
            assets: [
              { symbol: 'VTSAX', quantity: 800, avgCost: 95, price: 132, assetType: 'mutual_fund' },
              { symbol: 'VBTLX', quantity: 1500, avgCost: 11, price: 10.2, assetType: 'mutual_fund' },
            ],
          },
          {
            accountName: 'Vanguard Taxable',
            accountType: 'TaxableBrokerage',
            balance: 240000,
            assets: [
              { symbol: 'VOO', quantity: 350, avgCost: 380, price: 475, assetType: 'etf' },
              { symbol: 'VXUS', quantity: 600, avgCost: 55, price: 58, assetType: 'etf' },
            ],
          },
        ],
      },
      {
        name: 'Schwab',
        accounts: [
          {
            accountName: 'Schwab Roth IRA',
            accountType: 'RothRetirement',
            isRetirement: true,
            balance: 180000,
            assets: [
              { symbol: 'SCHB', quantity: 400, avgCost: 50, price: 62, assetType: 'etf' },
              { symbol: 'SCHF', quantity: 800, avgCost: 35, price: 38, assetType: 'etf' },
            ],
          },
          {
            accountName: 'Schwab HSA',
            accountType: 'HSA',
            balance: 35000,
            assets: [
              { symbol: 'VTI', quantity: 110, avgCost: 200, price: 245, assetType: 'etf' },
            ],
          },
        ],
      },
      {
        name: 'Home',
        description: 'Primary residence + mortgage',
        accounts: [
          {
            accountName: 'Primary Home',
            accountType: 'RealEstate',
            realEstate: {
              propertyType: 'primary_home',
              currentValue: 850000,
              outstandingLoan: 420000,
              interestRate: 4.25,
              monthlyPayment: 3200,
            },
          },
          {
            accountName: 'Mortgage',
            accountType: 'MortgageLoan',
            balance: -420000,
          },
        ],
      },
    ],
    cashFlows: [
      { kind: 'Income', category: 'Salary', amount: 15000, source: 'Director, BigCorp', inflationAdjusted: true },
      { kind: 'Income', category: 'OtherIncome', amount: 4000, source: 'Consulting gig', endDate: new Date('2026-12-31') },
      { kind: 'Income', category: 'Pension', amount: 1800, source: 'MegaCorp Pension', startDate: new Date('2033-09-01') },
      { kind: 'Income', category: 'SocialSecurity', amount: 3200, source: 'SSA', startDate: new Date('2033-09-01'), inflationAdjusted: true },
      { kind: 'Expense', category: 'Housing', amount: 3200, source: 'Mortgage' },
      { kind: 'Expense', category: 'Living', amount: 3200 },
      { kind: 'Expense', category: 'Healthcare', amount: 850 },
      { kind: 'Expense', category: 'Taxes', amount: 4500 },
      { kind: 'Expense', category: 'Discretionary', amount: 2000 },
    ],
  },

  // Jack & Jill — young couple, 2 kids, dual income, starter home + rental property.
  {
    email: 'jackandjill@mystocks.ai',
    password: 'abcdab',
    firstName: 'Jack',
    lastName: 'Hill',
    birthDate: new Date('1992-03-15'),
    city: 'Austin',
    state: 'TX',
    referenceTitle: 'Dual-income couple, 2 kids, starter home + rental',
    referenceDescription:
      'A 34-year-old married couple with two kids in Austin. Both have Traditional 401(k)s, plus a joint Fidelity brokerage, family HSA, primary home with mortgage, and an inherited rental property. Aggressive risk tolerance, long accumulation horizon.',
    profile: {
      monthlyIncome: 19000,
      monthlyMortgage: 2800,
      monthlyFixedExpenses: 7500,
      emergencyFund: 30000,
      // Jack's only — Jill's intentionally left absent on this single-user record;
      // surfaces a "missing info" prompt opportunity for the retirement page.
      estimatedSocialSecurityAt65: 2400,
      homeValue: 620000,
      totalDebt: 380000,
      riskTolerance: 'aggressive',
      dependents: 2,
      employmentStatus: 'employed',
      housingType: 'own',
      investmentExperience: 'beginner',
    },
    portfolios: [
      {
        name: 'Fidelity Joint',
        accounts: [
          {
            accountName: 'Joint Taxable Brokerage',
            accountType: 'TaxableBrokerage',
            balance: 40000,
            assets: [
              { symbol: 'VTI', quantity: 150, avgCost: 215, price: 245, assetType: 'etf' },
              { symbol: 'QQQ', quantity: 20, avgCost: 380, price: 510, assetType: 'etf' },
            ],
          },
        ],
      },
      {
        name: "Jack's 401(k)",
        accounts: [
          {
            accountName: "Jack's Traditional 401(k)",
            accountType: 'TraditionalRetirement',
            isRetirement: true,
            balance: 145000,
            assets: [
              { symbol: 'FXAIX', quantity: 700, avgCost: 165, price: 198, assetType: 'mutual_fund' },
              { symbol: 'FXNAX', quantity: 1200, avgCost: 10.5, price: 9.8, assetType: 'mutual_fund' },
            ],
          },
        ],
      },
      {
        name: "Jill's 401(k)",
        accounts: [
          {
            accountName: "Jill's Traditional 401(k)",
            accountType: 'TraditionalRetirement',
            isRetirement: true,
            balance: 95000,
            assets: [
              { symbol: 'VFIAX', quantity: 220, avgCost: 380, price: 475, assetType: 'mutual_fund' },
            ],
          },
        ],
      },
      {
        name: 'HSA Family',
        accounts: [
          {
            accountName: 'Family HSA',
            accountType: 'HSA',
            balance: 12000,
            assets: [{ symbol: 'VTI', quantity: 50, avgCost: 230, price: 245, assetType: 'etf' }],
          },
        ],
      },
      {
        name: 'Home',
        accounts: [
          {
            accountName: 'Starter Home',
            accountType: 'RealEstate',
            realEstate: {
              propertyType: 'primary_home',
              currentValue: 620000,
              outstandingLoan: 380000,
              interestRate: 6.5,
              monthlyPayment: 2800,
            },
          },
          {
            accountName: 'Home Mortgage',
            accountType: 'MortgageLoan',
            balance: -380000,
          },
        ],
      },
      {
        name: 'Rental Property',
        accounts: [
          {
            accountName: 'Lake Cabin Rental',
            accountType: 'RealEstate',
            realEstate: {
              propertyType: 'rental',
              currentValue: 285000,
              outstandingLoan: 0,
              interestRate: null,
              monthlyPayment: null,
            },
          },
        ],
      },
    ],
    cashFlows: [
      { kind: 'Income', category: 'Salary', amount: 11000, source: 'Jack — Software Engineer', inflationAdjusted: true },
      { kind: 'Income', category: 'Salary', amount: 8000, source: 'Jill — Marketing Director', inflationAdjusted: true },
      { kind: 'Income', category: 'RentalIncome', amount: 1500, source: 'Lake Cabin' },
      { kind: 'Expense', category: 'Housing', amount: 2800, source: 'Mortgage' },
      { kind: 'Expense', category: 'Living', amount: 2800 },
      // No Childcare bucket in the current CashFlowCategory enum — using Discretionary
      // with an explicit source label. Flagged in the seed plan as a category gap.
      { kind: 'Expense', category: 'Discretionary', amount: 1800, source: 'Childcare' },
      { kind: 'Expense', category: 'Healthcare', amount: 650 },
      { kind: 'Expense', category: 'Taxes', amount: 3800 },
    ],
  },
];

// ---- core seed routine ----

async function seedPersona(p: PersonaSeed) {
  // 1) Wipe any prior copy of this email (FK cascades clean up Portfolio/Account/Asset/CashFlow).
  await prisma.user.deleteMany({ where: { email: p.email } });

  // 2) Create user with hashed password + profile fields.
  const hash = await hashPassword(p.password);
  const user = await prisma.user.create({
    data: {
      email: p.email,
      password: hash,
      firstName: p.firstName,
      lastName: p.lastName,
      birthDate: p.birthDate,
      city: p.city,
      state: p.state,
      // Phase 3.5: mark as a reference profile so the Templates page surfaces it.
      isReferenceProfile: true,
      referenceTitle: p.referenceTitle,
      referenceDescription: p.referenceDescription,
      ...p.profile,
    },
  });

  // 3) Per portfolio: direct-Prisma create the portfolio (skipping the Phase-2
  //    auto-default-Other account that would litter the demo), then per account:
  //    use the capability to create + (optionally) attach RealEstateDetails;
  //    then direct-Prisma create assets with both avgCost AND price set.
  let totalAccounts = 0;
  let totalAssets = 0;

  for (const port of p.portfolios) {
    const portfolio = await prisma.portfolio.create({
      data: { userId: user.id, name: port.name, description: port.description ?? null },
    });

    for (const acc of port.accounts) {
      const created = await createAccount(
        {
          portfolioId: portfolio.id,
          accountName: acc.accountName,
          accountType: acc.accountType,
          isRetirement: acc.isRetirement,
          balance: acc.balance,
        },
        user.id,
      );
      totalAccounts++;

      if (acc.realEstate && created.accountType === 'RealEstate') {
        await upsertRealEstateDetails(created.id, acc.realEstate, user.id);
      }

      if (acc.assets?.length) {
        await prisma.asset.createMany({
          data: acc.assets.map((a) => ({
            portfolioId: portfolio.id,
            accountId: created.id,
            symbol: a.symbol,
            quantity: a.quantity,
            avgCost: a.avgCost,
            price: a.price,
            assetType: a.assetType ?? 'stock',
          })),
        });
        totalAssets += acc.assets.length;
      }
    }
  }

  // 4) Cash flows via lib/income.
  for (const cf of p.cashFlows) {
    await createCashFlow(
      {
        kind: cf.kind,
        category: cf.category,
        amount: cf.amount,
        frequency: cf.frequency ?? 'Monthly',
        source: cf.source,
        notes: cf.notes,
        startDate: cf.startDate ?? null,
        endDate: cf.endDate ?? null,
        inflationAdjusted: cf.inflationAdjusted ?? false,
      },
      user.id,
    );
  }

  console.log(
    `  ✓ ${p.firstName} ${p.lastName.padEnd(8)} (${p.email.padEnd(32)}) ` +
      `→ portfolios=${p.portfolios.length}, accounts=${totalAccounts}, assets=${totalAssets}, ` +
      `cashFlows=${p.cashFlows.length}`,
  );
}

async function main() {
  console.log('Seeding demo users...');
  for (const p of PERSONAS) {
    await seedPersona(p);
  }

  console.log('\nCREDENTIALS (dev only):');
  for (const p of PERSONAS) {
    console.log(`  ${p.email}  /  ${p.password}`);
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Seed failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
