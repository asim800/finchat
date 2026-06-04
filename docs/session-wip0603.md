# Session WIP — 2026-06-03

Long arc covering Phases 0 → 4-C of the retirement-centric phased plan, plus the
3.5 refactor and a Phase-3 polish pass. Branch `retire`; latest commit
`36c464cb`.

## Overview

This session continued the Phase 0-2 work-in-progress and shipped four major
chunks of new functionality plus a stack of fixes and polish. Everything is on
`origin/retire`.

Latest commits on the branch (newest first):

| SHA | Type | Summary |
|---|---|---|
| `36c464cb` | docs | Phase 4 status + 4 open decisions for morning review |
| `700f0e39` | fix+feat | Sign-in regressions fixed + Phase 4 Part C (MC sandbox page) |
| `c3b599e6` | feat | Phase 4 (A+B) — MC service in-repo + lib/mc capability |
| `d3806034` | docs | Phase 4 (A+B) execution plan |
| `0877ca21` | feat | Phase 3.5 — reference profiles + pull-a-profile + directory + diagnostic |
| `e24424a5` | docs | Phase 3.5 refactor plan |
| `c9919778` | docs | Retirement projection numbers analysis |
| `bdf22b7a` | fix | Retirement: use REAL returns (not nominal) for today's-\$ projection |
| `ee0a5859` | feat | Phase 3 — Retirement Hub (capability + thin page) |
| `a7b76532` | fix | Portfolio: fall back to stored asset.price when historical lookup misses |
| `8bef0028` | chore | Seed 3 demo users for manual review |
| `96fdc747` | feat | Phase 2 — Accounts UI with per-account asset tables |
| (earlier) | feat | Phase 1.A + 1.B (Income) and Phase 0 (Accounts schema) |

## Phases shipped

| Phase | Status | Key files |
|---|---|---|
| **0 — Domain reshape** | ✅ | `prisma/schema.prisma` (AccountType enum, RealEstateDetails, CashFlow), `lib/accounts/*`, `app/api/accounts/*` |
| **1 — Income** | ✅ | `lib/income/*`, `app/api/income/*`, `app/dashboard/income/*` |
| **2 — Portfolio page refresh** | ✅ | `components/portfolio/multi-portfolio-manager.tsx`, colocated `_components/` in `app/dashboard/myportfolio/`, polymorphic account form, declutter passes |
| **3 — Retirement Hub** | ✅ | `lib/retirement/*` (deterministic projection + readiness + investable balance + asset matrix + real-estate wealth), `app/api/retirement/project/`, `app/dashboard/retirement/page.tsx` + 7 colocated components |
| **3.5 — Pre-Phase-4 refactor** | ✅ | `User.isReferenceProfile/Title/Description` schema fields, `lib/reference/*` (list/get/copy), `app/dashboard/reference/[userId]/*` viewers, copy flow, `app/directory/page.tsx`, `app/dashboard/retirement/diagnostic/page.tsx` with override controls |
| **4-A — MC service in-repo** | ✅ | `services/monte-carlo-service/` (vendored from external `/home/saahmed1/coding/python/fin/projects/portfolio/`, with `findata` lib vendored at `lib/findata/`); runs on port 8001 |
| **4-B — `lib/mc` capability** | ✅ | `lib/mc/types.ts`, `mc-client.ts`, `portfolio-to-config.ts`, `index.ts`, `app/api/mc/simulate/route.ts`, `MC_SERVICE_URL` env var |
| **4-C — MC sandbox page** | ✅ | `app/dashboard/monte-carlo/page.tsx` + `MonteCarloPageClient`, `MCInputsForm`, `MCFanChart`, `MCSummary` |
| **4-D — Retirement → MC swap** | 🔄 deferred per user decision; design locked in (p5/p95 band, NOT silent swap) |
| **5 — Chat as data-collector** | ⏳ untouched |

## Key decisions made (locked in)

| Decision | Choice | Where it shows up |
|---|---|---|
| Phase 3 retirement bands | p5/p95 honest 90% band (when MC swap ships in 4-D) | Pre-locked design for 4-D |
| Phase 3 returns | **Real** returns (3/5/7%) not nominal (5/7/9%) — fixed mid-session after John's chart hit $200M | `lib/retirement/index.ts` `expectedReturnFor` |
| Phase 3 retirement model | Real estate **excluded** from projection, shown separately as net wealth | `lib/retirement` + `RealEstateSummary` component |
| Phase 3 readiness metric | "Money lasts to age X" + qualitative badge (On track / Tight / Falling behind) | `ReadinessHeadline` component |
| Phase 3.5 reference profile auth scope | Logged-in users only (reversed from initial "truly public" answer) | `app/dashboard/reference/` (under /dashboard/), middleware `protectedRoutes` |
| Phase 3.5 pull-a-profile semantics | Granular section-by-section + additive (never destroys existing data; profile fields only fill empty) | `lib/reference/copyReferenceSections` |
| Phase 3.5 diagnostic page | Separate `/dashboard/retirement/diagnostic` with SS toggle + override income/expenses + per-account breakdown | `app/dashboard/retirement/diagnostic/`, `RetirementInputs` extension |
| Phase 4 cadence | A+B together; C as next; D deferred | Realized in commit sequence |
| Phase 4-D UX | NOT a silent swap; keep deterministic + revisit after C user feedback | Pre-locked for 4-D |
| MC sampling default for sandbox | Parametric only (bootstrap needs historical yfinance data for all tickers) | `MonteCarloPageClient` `SAMPLING_METHOD = 'parametric'` |

## Code arc — what was actually written or modified

### Phase 3 (Retirement Hub)
- `lib/retirement/types.ts` + `index.ts` — `projectRetirement(userId, inputs) → RetirementResult` composing `lib/accounts` + `lib/income` + `User` profile. Deterministic 3-path simulation (low/expected/high with ±2% band). Real returns by risk tolerance. Social Security folded from CashFlow rows OR profile fallback.
- `app/api/retirement/project/route.ts` — thin wrapper.
- `app/dashboard/retirement/page.tsx` + 7 colocated components: `RetirementPageClient` (orchestrator), `ReadinessHeadline`, `ProjectionChart` (Recharts ComposedChart + low/high band + retirement-age ReferenceLine), `WhatWeKnowPanel`, `RetirementInputsForm`, `AssetMatrix`, `RealEstateSummary`.
- Middleware + nav additions.

### Phase 3.5 (Refactor before Phase 4)
- `prisma/schema.prisma` — `User.isReferenceProfile/Title/Description`, `prisma db push`.
- `seed-demo-users.ts` — set the reference fields on John / Jane / Jack.
- `lib/reference/types.ts` + `index.ts` — `listReferenceProfiles`, `getReferenceProfile`, `copyReferenceSections`.
- Templates page (`app/dashboard/portfolio/page.tsx`) — full rewrite; hardcoded `REFERENCE_PORTFOLIOS` deleted, DB-backed cards for authed users + Sign-in CTA for guests.
- `app/dashboard/reference/[userId]/{portfolio,income,copy}/page.tsx` + `_components/PortfolioReadOnly` + `IncomeReadOnly` + `CopyReferenceClient`.
- `app/api/reference/copy/route.ts`.
- `app/directory/page.tsx` — guest-friendly sitemap.
- Top bars (both variants) gained "Directory".
- `lib/retirement` extended with `overrideMonthlyIncome` / `overrideMonthlyExpenses` / `includeSocialSecurity` + `investableBreakdown`.
- `app/dashboard/retirement/diagnostic/page.tsx` + `RetirementDiagnosticClient`.

### Phase 4 (Monte Carlo)
- **Part A**: copied `src/`, `configs/`, `tests/`, `docs/`, `pyproject.toml`, `uv.lock`, `.python-version` into `services/monte-carlo-service/`. Vendored `findata` into `lib/findata/`; added `[tool.uv.sources]` editable path dep. Copied required default data files into `configs/data/`.
- **Part B**: `lib/mc/types.ts` (TS mirror), `mc-client.ts` (`runSimulation` + `checkMcHealth`), `portfolio-to-config.ts` (the "tweak for end user" mapping — weight normalization + dedup of duplicate symbols), `index.ts` barrel; `app/api/mc/simulate/route.ts` (thin: auth → portfolio → config → service → return); `MC_SERVICE_URL` env var (NOT committed).
- **Part C**: `app/dashboard/monte-carlo/page.tsx` + 4 components: `MonteCarloPageClient` (orchestrator), `MCInputsForm` (4 inputs), `MCFanChart` (Recharts ComposedChart with two nested translucent bands p5-p95 + p25-p75 + median line + retirement ReferenceLine), `MCSummary` (success rate + status badge + percentile snapshots).
- Directory promoted MC link from "Coming soon" to live; middleware added `/dashboard/monte-carlo` to `protectedRoutes`.

### Sign-in fixes (1a + 1b)
- `middleware.ts` — removed the `isAuthenticated → /login → /dashboard/chat` redirect. Was breaking the "switch demo user" flow.
- `components/auth/login-form.tsx` — changed `<Button disabled={!form.canSubmit}>` to `disabled={form.loading}`. The canSubmit gate was false on initial render (empty required fields → invalid) so the button was disabled before the user could even click it.

### Seed users (3 personas, idempotent reseed)
- `frontend/scripts/seed-demo-users.ts` + `npm run seed:demo`:
  - John Doe (`johndoe@mystocks.ai` / `abcdab`): 40, single, NYC renter, 1 portfolio with Roth + Taxable, $83K investable
  - Jane Doe (`janedoe@mystocks.ai` / `abcdab`): 57, near-retirement, 3 portfolios incl. real estate + mortgage, $404K investable
  - Jack & Jill (`jackandjill@mystocks.ai` / `abcdab`): 34, couple with 2 kids, 6 portfolios incl. rental property, $314K investable

## Problems solved during this session

| Problem | Resolution |
|---|---|
| **John's retirement chart Y-axis reached $200M+** | Diagnosed as nominal-vs-real return mismatch. Capability claimed "today's dollars" but used 5/7/9% NOMINAL returns. Switched to 3/5/7% REAL returns + clarified the headline subtitle. Y-axis dropped to ~$80M. |
| **Retirement numbers still felt high after fix** | User suspected zero-expenses or no-SS. Diagnostic table proved both are correctly applied; the real cause is the seed users have extreme savings rates (41-42% of gross income) AND tiny retirement-spending targets, yielding withdrawal rates of 0.45-0.56% — way below the safe 4% rule. Documented in `retirement-projection-numbers-analysis.md`. |
| **Portfolio page summary showed $0 values for many tickers** | `HistoricalPriceService.getLatestPricesForSymbols()` returns undefined for symbols missing from cache. Added `marketPrice ?? asset.price ?? null` fallback in `getPortfolioWithMarketValues` so seed prices show through. Commit `a7b76532`. |
| **Templates page was hardcoded mock data** | Rewrote in Phase 3.5: DB-backed reference profiles for authed users; sign-in CTA for guests. |
| **MC service had external `findata` dependency** | Vendored `findata` into `services/monte-carlo-service/lib/findata/` and added as `[tool.uv.sources]` editable path dep. |
| **MC service needed missing data files** | Copied `simulated_mean_returns.csv` + `simulated_cov_matrices.txt` from external project into `configs/data/`. |
| **Sign-in click navigated to chat (not to form)** | Middleware was bouncing authed users from `/login` to `/dashboard/chat`. Removed the redirect. |
| **Sign-in button unresponsive on initial page load** | Button was `disabled={!form.canSubmit}` and canSubmit starts false (empty required fields → invalid). Changed to `disabled={form.loading}`. |
| **Dev server's Prisma client got stale after `prisma db push`** | Documented in commit messages; user needs `Ctrl+C` + `npm run dev` to pick up schema changes. Pattern noted for future schema changes. |

## Open questions for morning review

The full status doc is at `docs/phase-4-status-and-followups.md` (committed
`36c464cb`). 4 decisions wait for input — short version:

1. **MC ticker coverage gap (high priority)** — cov matrix only knows
   SPY/AGG/NVDA/GLD; demo users hold different ETFs. MC sandbox shows error
   instead of fan chart for all current seed users. Options: (A) regenerate
   cov matrix with broader tickers, (B) seed a 4th MC-ready user, (C)
   implement yfinance fallback in MC service. **My pick: A.**
2. **Phase 4 Part D timing** — when to swap `lib/retirement` to call MC. Band
   mapping (p5/p95) and "not a silent swap" already locked. Options: D-now,
   D-after-feedback, D-explicit-toggle. **My pick: D-after-feedback.**
3. **Clean up the original external Python source** at
   `/home/saahmed1/coding/python/fin/projects/portfolio/`. Now redundant with
   the vendored copy. **My pick: delete `portfolio/`, keep `findata/` (still
   used by other Python projects).**
4. **(Low priority) Price-source consistency** — `lib/retirement` reads raw
   `asset.price`; `lib/portfolio-service` and `lib/mc` apply the fallback. For
   demo users they currently match; fix when divergence bites a real user.

Additional deferred items not in the "decisions" list:
- **MC service dep trim** (pyqt5, matplotlib, ipython, cvxpy/ecos) — `uv sync`
  is ~3 minutes; could drop to ~30s. Do when friction warrants.
- **Phase 5** — chat-write capability contracts + proactive gap-filler +
  chat→portfolio decoupling. Untouched; planned per `docs/phased-plan.md`.

## Verification status

| Surface | Verified how |
|---|---|
| Retirement page (Phase 3) | Playwright walkthrough on all 3 demo users (commit message in `ee0a5859`) |
| Reference profiles + viewers (Phase 3.5) | Playwright: guest path verified (Sign-in CTA, middleware redirect, Directory); auth path required dev-server restart |
| Diagnostic page (Phase 3.5) | In-process smoke (SS toggle drops John's $2,800; override income changes source attribution; investableBreakdown rows present) |
| MC service (Phase 4 A) | `/health` 200; sample `POST /api/mc/simulate` returns 105 fan-chart points for SPY/AGG/NVDA/GLD parametric mode |
| MC capability (Phase 4 B) | tsc baseline preserved; in-process smoke + Playwright fetch of `/api/mc/simulate` proving auth gating (401), validation (400), MC plumbing (500 with engine error surfaced cleanly) |
| MC sandbox page (Phase 4 C) | Playwright: page renders, inputs visible, Run button enabled, click → error surfaces cleanly (ticker coverage gap is a data issue, not code) |
| Sign-in fixes | Playwright: authed user → `/login` shows form (no bounce); Sign In button `disabled: false` on initial load |

## File summary (this session's net adds)

- **Schema**: `User` gained 3 reference-profile fields.
- **lib/**: `lib/retirement/`, `lib/reference/`, `lib/mc/` are new capabilities; `lib/portfolio-service.ts` gained the price-fallback fix.
- **API routes**: `/api/retirement/project`, `/api/reference/copy`, `/api/mc/simulate`.
- **Pages**: `/dashboard/retirement/`, `/dashboard/retirement/diagnostic/`, `/dashboard/reference/[userId]/{portfolio,income,copy}/`, `/dashboard/monte-carlo/`, `/directory/`.
- **Services**: `services/monte-carlo-service/` (Python, ~120 files, vendored from external).
- **Docs** (tracked in `docs/`): `phased-plan.md` updates, `retirement-projection-numbers-analysis.md`, `phase-3.5-refactor-plan.md`, `phase-4-mc-integration-plan.md`, `phase-4-status-and-followups.md`, this file.
- **Scripts**: `scripts/seed-demo-users.ts` + `npm run seed:demo`.

Sleep doc: **phase-4-status-and-followups.md** is the morning-review document
with the 4 open decisions. This session-WIP doc is the broader narrative.
