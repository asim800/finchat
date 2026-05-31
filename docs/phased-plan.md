# Phased Plan — Retirement-Centric Site Evolution

*Status: agreed (2026-05). Branch: `retire`.
Companions: `architecture-capabilities-and-pages.md` (philosophy),
`retirement-pilot-plan.md` (Phase 3 detail), `monte-carlo-integration-plan.md` (Phase 4 detail).*

## Big picture
**Retirement is the destination.** Portfolio, Income, and Chat are *tributaries* that
collect/render data for the retirement decision. Each phase ships value, follows the
4-bucket philosophy (thin pages over a workhorse `lib/`), and avoids pre-refactoring
working code.

## Data shape (after Phase 0)
- **User** → many **Portfolio** (user-named groupings, e.g. "Fidelity", "Wells Fargo" —
  mirrors how the user organizes money in their head) → many **Account** → many **Asset**.
- **Account.accountType** is **mandatory**, chosen from the table below.
- Optional **`isRetirement`** flag on Account (orthogonal to type — a brokerage account can
  be earmarked for retirement; a Roth obviously is).
- **`RealEstateDetails`** — new table, linked to an Account of type Real Estate:
  `{currentValue, outstandingLoan, interestRate, monthlyPayment, propertyType}`. A companion
  Mortgage/Loan account models the debt as a negative balance.
- **`CashFlow`** (Phase 1, unified inflow/outflow): `{type, amount, frequency, startDate,
  endDate?, source, notes}` — pensions, SS, annuities, current/retirement expenses.
- **`RetirementPlan`** (saved scenarios): **DEFERRED** until usage proves it.

### Account types (industry-standard names)
| Enum value | Display label | Covers |
|---|---|---|
| `CashBank` | **Cash & Bank** | Checking, savings, CDs, money market |
| `TaxableBrokerage` | **Brokerage (Taxable)** | Stocks / ETFs / bonds in a regular brokerage |
| `TraditionalRetirement` | **Traditional Retirement (401(k) / IRA)** | Pre-tax contributions, taxable on withdrawal |
| `RothRetirement` | **Roth (Roth 401(k) / Roth IRA)** | Post-tax contributions, tax-free withdrawals |
| `HSA` | **Health Savings Account (HSA)** | Triple-tax-advantaged. **(Suggested addition — drop if you don't want it.)** |
| `RealEstate` | **Real Estate** | Primary home, rentals, other property (uses `RealEstateDetails`) |
| `MortgageLoan` | **Mortgage / Loan** | Debt (negative-balance account) |
| `Other` | **Other** | Anything not covered above |

## Phases (dependency order — feeders before the hub)

### Phase 0 — Domain reshape (foundation)
**Goal:** the Account + Real-Estate domain everything else builds on.
- Extend `Account` model (required `accountType`, `isRetirement`); link Asset → Account.
- New `RealEstateDetails` table.
- New **`lib/accounts`** capability + `/api/accounts/*` endpoints (typed public API + HTTP face).
- Prisma migration; backfill existing Assets into a default Account per Portfolio.

### Phase 1 — Income capability + Income page
**Goal:** capture inflows/outflows; minimal friction.
- `CashFlow` model + **`lib/income`** capability (CRUD, list-by-period) + `/api/income/*`.
- Income page (`app/dashboard/income/page.tsx`): low-friction forms; partial data accepted;
  sensible defaults (e.g. expected retirement expense defaults to 0.8 × current).
- *(Chat triage handler for income moved to **Phase 5** — clusters all chat-write contract
  work in one place so we design it once.)*

### Phase 2 — Portfolio page refresh
**Goal:** the Portfolio page surfaces the richer domain (Accounts as first-class UI).
- **Structure:** Portfolio = user-named bucket (institution/grouping). Each Portfolio holds
  **multiple Accounts**, each labeled by type. Assets belong to Accounts (not directly to
  Portfolios). Example: Portfolio `"Fidelity"` → Accounts `[Roth IRA, Taxable, Traditional]`
  → Assets per account.
- **Backfill (already done in Phase 0):** every existing Portfolio has a default Account
  (named `"<Portfolio> (Default)"`, type `TaxableBrokerage` — the realistic guess for
  pre-existing data); all existing Assets are linked. Users recategorize via the new
  account-edit form. **New portfolios going forward** auto-get a default Account (type
  `Other`) on create so they're never orphaned.
- **Add-Account UI** (inline inside each Portfolio): polymorphic form — top-level type
  select, then type-dependent fields:
  - Standard types (CashBank / TaxableBrokerage / TraditionalRetirement / RothRetirement /
    HSA / Other): name only.
  - Real Estate: name + `RealEstateDetails` (propertyType, currentValue, outstandingLoan,
    interestRate, monthlyPayment).
  - Mortgage/Loan: name + balance owed.
- **Add-Asset UI:** existing form gets an **Account selector** (which account inside the
  Portfolio to put it in). Existing assets are not movable in v1 (delete-and-re-add).
- **Asset.portfolioId stays alongside accountId** (backward-compat for ~25 legacy call
  sites); Phase 5 retires `portfolioId` as part of chat→portfolio decoupling.
- **Chat-writes** stay on existing internals (untouched). They'll set `accountId=null`,
  surfacing as an **"Unassigned" section** in the target Portfolio; user recategorizes
  manually. The clean capability route happens in Phase 5.
- **God-file discipline:** new UI lives in new colocated `_components/` files
  (`AccountTypeBadge`, `AccountTypeSelect`, `AccountSection`, `AccountForm`,
  `RealEstateFields`, `AccountSelector`). Edits to existing god-files
  (`portfolio-table.tsx`, `multi-portfolio-manager.tsx`) stay minimal (one-line slot
  insertions); `wc -l` delta reported pre-merge.
- Consumes `lib/accounts` via `/api/accounts/*` (built in Phase 0) — no new capability work.

### Phase 3 — Bare retirement page (the hub)
**Goal:** the central destination; thin disposable UI; one emotional payoff.
- **`lib/retirement`** capability composes accounts (via `lib/accounts`) + cash flows
  (via `lib/income`) + `User` profile → `RetirementProjection` + `Readiness`. v1 internals:
  deterministic projection (expected return + flows over horizon, simple ± band). No Python.
- `app/dashboard/retirement/page.tsx`:
  - **Headline readiness metric** (one big number — why users open the page).
  - Simple projection chart (Recharts).
  - **"What we know about you" panel** — surfaces filled vs. missing inputs with deep-links
    into Portfolio / Income / Chat (the retirement page is the orchestrator UI).
  - Thin inputs (retirement age, target spending), defaulted from profile; ephemeral.
- See `retirement-pilot-plan.md` for the detailed step-by-step.

### Phase 4 — Monte-Carlo capability + power-user sandbox + retirement upgrade
**Goal:** real probabilistic projections + a quant sandbox; retirement picks them up transparently.
- Move the standalone MC service into `services/monte-carlo-service/` (port :8001); wire
  **`lib/mc`** typed client + `/api/mc/*` endpoints. See `monte-carlo-integration-plan.md`.
- **`/dashboard/monte-carlo`** — **power-user sandbox** (full config surface: sampling,
  sweeps, jobs as desired). Uses `lib/mc` directly. *Not a consumer page.*
- **Retirement page internals upgrade:** swap `lib/retirement`'s projection from deterministic
  to MC-service call — *still through `lib/retirement`'s contract*. The retirement *page* is
  unchanged. (The architecture proving itself.)

### Phase 5 — Chat as data-collector + proactive gap-filler (and the deferred chat→portfolio decoupling)
**Goal:** chat writes structured data into our capabilities, and proactively detects gaps.
- **Chat-write handlers — all on clean capability contracts:**
  - Income writes (formerly Phase 1.C): a triage handler that recognizes "I'll get $2,500 SS
    at 65" / "Our rent is $1,800" / etc. → calls `lib/income` public API (never internals).
  - Accounts writes: similar handler for "I have $50k in my Roth at Fidelity" → `lib/accounts`.
- **Proactive gap-filler:** extend chat triage to inspect what's missing (no SS estimate,
  no expense profile, no mortgage info, etc.) and prompt the user. Writes route through the
  same clean `lib/income`/`lib/accounts` contracts above.
- **Opportunistic refactor:** while we're already enriching chat writes, publish
  `lib/portfolio`'s clean public API and repoint *existing* chat→portfolio writes through it.
  This is the agreed "do last" decoupling, addressed exactly when it pays off.

## Build discipline (every phase)
- Capability = **public `index.ts`** (typed in-process API) + **HTTP face** (`/api/*`).
- Pages stay thin — *no business logic* in `page.tsx` or `route.ts`.
- Persist only **core domain** (Accounts, RealEstateDetails, CashFlow). Defer speculative
  scenario state (`RetirementPlan`, saved sweeps).
- Each new chat-write goes through a clean capability contract (never internals).

## Verification per phase
`npm run build` clean; Playwright walkthrough of the new page; dev services (FastAPI/MC) up
only when their phase needs them; Prisma migrations validated locally before commit.
