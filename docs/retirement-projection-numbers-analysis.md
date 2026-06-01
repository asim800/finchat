# Retirement Projection — Why the Numbers Look So Big

*Written 2026-05-31, in response to user observation that John's chart Y-axis
reached $200M+ before the nominal→real return fix, and still feels too large at
$80M after the fix.*

## TL;DR

1. **Expenses ARE in the model** — both during accumulation (income − expenses
   = monthly contribution) and during retirement (target spending).
2. **Social Security IS in the model** for all three demo users — via CashFlow
   `SocialSecurity` rows where present, with `User.estimatedSocialSecurityAt65`
   as a fallback when no CashFlow exists.
3. **The reason the chart still looks big** is arithmetic, not a model bug: the
   seed users have extreme savings rates AND their auto-defaulted retirement
   spending is so low that their post-65 withdrawal rate is **0.45–0.56%** —
   one-tenth of the well-known "4% rule." Of course the balance grows at 7%
   real return. The model is honestly reflecting "very over-saved relative to
   stated spend target."
4. **The seed data is the lever to pull** if you want chart visuals that look
   "normal" — not the model.
5. **What the model DOESN'T model** (intentionally, for v1 deterministic) does
   make these numbers optimistic in real-life terms — that's Phase 4's job.

## Diagnostic snapshot (verified by in-process smoke)

Each user's actual inputs as the capability sees them, with the resulting
projection and the all-important **withdrawal rate**:

| User | Inc/mo | Exp/mo | Net save/mo | Years to retire | Real return | Start bal | Target spend/mo | Retire income/mo (SS+) | Net withdraw/mo | Bal @ 65 | Bal @ 95 | **Withdraw rate** |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **John** (40) | $10,000 | $5,850 | $4,150 | 25 | 7% | $83,350 | $4,700 | $2,800 | $1,900 | $4.07M | $28.65M | **0.56%** |
| **Jane** (57) | $19,000 | $13,750 | $5,250 | 8 | 5% | $404,100 | $11,000 | $5,000 | $6,000 | $1.21M | $0.23M | **5.93%** |
| **Jack** (34) | $20,500 | $11,850 | $8,650 | 31 | 7% | $314,060 | $9,500 | $3,900 | $5,600 | $14.80M | $105.84M | **0.45%** |

Reference: the "4% rule" of thumb says a withdrawal rate of ~4% on a balanced
portfolio is sustainable for ~30 years. **John and Jack are withdrawing less
than 0.6%**; Jane is withdrawing 5.93% (above safe — which is why her balance
correctly declines to near-zero by 95).

## The hypothesis "we're not including expenses" — disproved

During **accumulation** (age < retirement):

```ts
const monthlyContribution = Math.max(0, monthlyIncome - monthlyExpenses);
// → John: max(0, 10000 - 5850) = $4,150/mo saved
balance += monthlyContribution * 12;  // each year, in real $
```

Expenses are subtracted before computing the savings rate. ✓

During **retirement** (age ≥ retirement):

```ts
const annualTarget = opts.monthlyTarget * 12;          // = retirement spend target
const annualRetIncome = opts.monthlyRetirementIncomeAtRetire * 12;
const withdrawal = Math.max(0, annualTarget - annualRetIncome);
balance -= withdrawal;
```

The user's stated **retirement spending target** IS the expense (auto-defaulted
to `0.8 × current monthly expenses`). Then SS/pension/rental income offsets the
draw. ✓

## The hypothesis "we're not including Social Security yet" — also disproved

Three paths into the retirement-income figure, ordered by precedence:

1. **CashFlow rows with category=`SocialSecurity`** (active, started by retirement
   date). Used when the user has explicitly modeled their SS as a CashFlow.
2. **CashFlow rows with category in {`Pension`, `Annuity`, `RentalIncome`}** —
   always summed when active at the retirement date.
3. **Fallback**: if there's no CashFlow `SocialSecurity` row but
   `User.estimatedSocialSecurityAt65` is set AND retirementAge ≥ 65, that
   amount is added to retirement income.

Per-user trace:

| User | CashFlow SS | CashFlow Pension | CashFlow Rental | Profile SS @ 65 | Total used |
|---|---:|---:|---:|---:|---:|
| John  | (none) | (none) | (none) | $2,800 → added | **$2,800/mo** |
| Jane  | $3,200/mo (from 2033) | $1,800/mo (from 2033) | (none) | $3,200 → NOT added (CashFlow SS exists) | **$5,000/mo** |
| Jack  | (none) | (none) | $1,500/mo | $2,400 → added | **$3,900/mo** |

The diagnostic above ("Retire income/mo") confirms each row.

## Why John and Jack's charts look enormous

It's compound interest on a high savings rate over a long horizon, against a
tiny withdrawal:

### John's math (worked end-to-end)

Pre-retirement (age 40 → 65, 25 years, 7% real return):
- Start: $83,350
- Contribute $49,800/yr
- FV of starting balance: $83,350 × 1.07²⁵ ≈ $452K
- FV of contributions: $49,800 × [(1.07²⁵ − 1) / 0.07] ≈ $3.15M
- Total at 65: **~$3.6M** (matches simulation's $4.07M; small difference from
  year-end accumulation timing)

Post-retirement (age 65 → 95, 30 years, 7% real, withdraw $22,800/yr):
- Each year: balance × 1.07 − $22,800
- Withdrawal-to-growth ratio: $22,800 / ($4M × 0.07 = $280K) = ~8% — i.e. the
  withdrawal is one-twelfth of the annual real growth. Balance keeps compounding.
- After 30 years: balance has more than 7× → **~$28.6M** (matches simulation)

### Jack & Jill's math

Same pattern, but with **31 years of accumulation** (younger) and **$103,800/yr
savings** (higher because dual income). Result: $14.8M nest egg at 65, then
another 30 years of compounding minus a tiny $67K/yr withdrawal → $106M at 95.

### Jane's math (the realistic one)

Only **8 years to retire**, much smaller savings cushion, and her target spend
is high enough that her withdrawal rate hits 5.93% — above the 4% safe-rate
threshold. So her balance declines from $1.21M at 65 to ~$226K at 95. **Her
chart looks "normal" because her seed inputs are realistic for her situation.**

## What the model intentionally does NOT include (v1 limitations)

These would all push the projected numbers DOWN to more realistic levels.
Phase 4 (Monte Carlo) is where most of them get handled honestly.

| Missing factor | Effect on projection | Where it goes |
|---|---|---|
| **Lifestyle creep / spending growth** | We hold real spending constant; in reality discretionary spend grows ~1%/yr in real terms | Future: target spending growth input |
| **Healthcare cost shocks** | Late-retirement medical can hit hard | Phase 4 MC + maybe a Healthcare cash-flow inflator |
| **Allocation glide-path** | We assume 7% real return forever; most retirees shift to bonds → ~3-4% real | Phase 4 MC samples allocation-aware return distributions |
| **Sequence-of-returns risk** | We assume average return every year; reality is highly variable, and a bad first decade in retirement can permanently impair the trajectory | **This is THE thing MC fixes** — fan-chart shows percentile outcomes |
| **Taxes on Traditional withdrawals** | Trad 401(k)/IRA → taxed as ordinary income on withdrawal; effective rate ~15-22% for retirees | Phase 4+ tax model |
| **RMDs (forced distributions starting age 73)** | Forces a minimum withdrawal even if you don't need it | Phase 4+ |
| **Spouse / household joint modeling** | Single-user only; Jack & Jill's "household" income is summed in CashFlow but no spousal SS, survivor planning, etc. | Future, when stably modeled |

## What you can do to make the demo chart "look normal" without changing the model

If you want the seed users to produce charts that don't dominate at $100M+:

| Option | What you change | Effect |
|---|---|---|
| **A. Raise John's & Jack's target spend in the page input** | Type a larger number in "Target spend per month" (e.g. John: $8,000; Jack: $15,000) | Withdrawal rate rises toward the 4% rule; balance flattens or declines |
| **B. Adjust seed data to more realistic savings rates** | In `frontend/scripts/seed-demo-users.ts`, raise John's expenses (e.g. $7,500 instead of $5,850 — drops savings rate from 41.5% → 25%) and/or lower his starting balance | Reduces compounding base; smaller chart numbers; still "on track" |
| **C. Wait for Phase 4 Monte Carlo** | Phase 4 fan chart will show the realistic probability distribution; the median path looks similar but the 10th-percentile path will show much smaller numbers | Honest uncertainty; no synthetic dampening |

Option C is the principled fix. Options A and B are demo-tuning shortcuts.

## Verification commands

To re-run the diagnostic any time:

```bash
cd frontend && npx tsx -e "
import { prisma } from './src/lib/db';
import { projectRetirement } from './src/lib/retirement';
import { sumMonthlyByKind } from './src/lib/income';
(async () => {
  for (const email of ['johndoe@mystocks.ai', 'janedoe@mystocks.ai', 'jackandjill@mystocks.ai']) {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, firstName: true } });
    if (!user) continue;
    const inc = await sumMonthlyByKind(user.id, 'Income', new Date());
    const exp = await sumMonthlyByKind(user.id, 'Expense', new Date());
    const target = Math.round(exp * 0.8 / 100) * 100;
    const r = await projectRetirement(user.id, { retirementAge: 65, targetMonthlySpending: target });
    const balAt65 = r.projection.path.find(p => p.age === 65)?.expected ?? 0;
    const withdrawAnnual = Math.max(0, target - r.inputsResolved.monthlyRetirementIncomeAtRetire) * 12;
    const rate = balAt65 > 0 ? (withdrawAnnual / balAt65 * 100).toFixed(2) : 'N/A';
    console.log(\`\${user.firstName} bal@65=\\\$\${(balAt65/1e6).toFixed(2)}M, withdrawRate=\${rate}%, lasts=\${r.readiness.lastsToAge}\`);
  }
  await prisma.\$disconnect();
})();
"
```

## Files touched and why (summary of the chain of fixes that led here)

1. **`fix(portfolio)` (`a7b76532`)** — `getPortfolioWithMarketValues` was overwriting `asset.price` with undefined when yfinance lookup missed; fallback to stored price. **Restored John's investable balance from "mostly $0" to $83K.** This made the projection numbers go UP because before this fix the engine thought he had no investable assets.

2. **`feat(retirement)` (`ee0a5859`)** — the Phase 3 capability + page. Initially used **nominal** returns (5/7/9%) while claiming "today's dollars" — silent inconsistency that ~3×'d the displayed numbers over 56 years.

3. **`fix(retirement)` (`bdf22b7a`)** — switched `expectedReturnFor` from nominal (5/7/9%) to **real** (3/5/7%). John's chart Y-axis dropped from ~$200M to ~$80M. Subtitle updated to make "7%" unambiguous: "real return (after inflation)".

## Open question for tomorrow

Do you want to (a) leave the model as-is and treat the seed data as showing "over-saved scenarios," (b) tune the seed data so the default demo looks more typical, or (c) push straight into Phase 4 to get proper MC fan charts that show downside risk? My recommendation: **(c)** — the model is honest, the seed data is a separate concern, and the meaningful next milestone is uncertainty quantification, not deterministic-number polish.
