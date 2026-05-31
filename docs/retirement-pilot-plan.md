# Plan — Retirement Page Pilot (capability-first, thin UI)

*Status: proposed (for review). Branch: `retire`. First pilot of the capabilities/disposable-pages
model (`CLAUDE.md` → "Architecture & Design Philosophy"; `docs/architecture-capabilities-and-pages.md`).*

## Decision & rationale
Build a **thin Retirement page** over a new **`lib/retirement` capability** whose v1 internals
are **simple** (a deterministic projection reusing existing portfolio + user-profile data).
**Later, upgrade the capability to call the standalone Monte-Carlo service — the page will not
change**, because it only knows the capability's contract.

Why this order (per the agreed philosophy):
- **Pages are thin, disposable UI; the workhorse is in the library/backend/DB.** The page just
  collects inputs and renders results.
- **Don't pre-refactor working code** — the retirement page only *reads* existing portfolio data,
  so no portfolio/chat refactor is needed.
- **Don't persist prematurely** — committing a `RetirementPlan` schema before user feedback fights
  "pivot quickly," so v1 has **no new DB model**; inputs default from the already-persisted `User`
  profile and stay page-local.
- **Ship simple, upgrade behind the contract** — the real MC engine is a later swap of the
  capability's internals, invisible to the page.

## Scope (v1)
**In:** a retirement page that, for the logged-in user, projects their portfolio toward/through
retirement and shows a chart + a readiness summary, driven by a few simple inputs.
**Out (deferred):** the standalone Monte-Carlo service, saved scenarios / `RetirementPlan`
persistence, parameter sweeps, multi-account modeling.

## The four buckets for this feature
| Bucket | This feature |
|---|---|
| **1. Database** | *Reads only* — existing `Portfolio`/`Asset` (holdings) + `User` profile fields. **No new model.** |
| **2. Frontend (UI)** | `app/dashboard/retirement/page.tsx` + colocated `_components/` — thin, disposable. |
| **3. Common library (workhorse)** | **`lib/retirement`** + its HTTP face `app/api/retirement/project/route.ts`. |
| **4. Python backend** | *Not used in v1* — simple in-library projection. (Later: standalone MC service.) |

## Build steps
1. **`lib/retirement/types.ts`** — `RetirementInputs` (retirement age/horizon, annual
   contribution, annual withdrawal, expected return / risk assumption) and `RetirementProjection`
   (balance path over time, a simple low/expected/high band, and a readiness summary).
2. **`lib/retirement/index.ts`** — public API `projectRetirement(userId, inputs): Promise<RetirementProjection>`:
   - read holdings via the existing portfolio path (`PortfolioService` / `/api/portfolio`),
   - read `User` profile (birthDate, monthlyIncome, monthlyFixedExpenses, emergencyFund,
     estimatedSocialSecurityAt65, riskTolerance),
   - compute a **deterministic projection** (expected return + contributions/withdrawals across the
     horizon; a simple ± band). No Python.
3. **`app/api/retirement/project/route.ts`** — thin: `getUserFromRequest` → `projectRetirement` → JSON.
4. **`app/dashboard/retirement/page.tsx`** (+ `_components/`) — inputs defaulted from the user's
   profile; submit → `/api/retirement/project` via `lib/http`; render a Recharts projection chart +
   readiness summary; loading/empty/error states; dark-mode native. Optional nav entry.

## Reuse (don't reinvent)
`lib/http` (client), `lib/auth` (`getUserFromRequest`), `lib/portfolio-service` (holdings),
`components/ui` + Recharts (`ChartDisplay` pattern), `number-utils` (formatting).

## Discipline to hold
- **All** data assembly + math lives in `lib/retirement`; the page/route contain **no business
  logic** (only input collection + rendering). This is what lets us pivot the page freely and swap
  the capability internals later.
- The page depends only on the capability's **contract** (`/api/retirement/project`), never on
  portfolio internals or any other page.

## Verification
`npm run dev` → log in as a user with holdings + profile → `/dashboard/retirement` → enter inputs →
see the projection chart + readiness. Confirm nothing app-logic lives in the page/route. Playwright
walkthrough; confirm dark mode.

## Later (upgrade path, not now)
Swap `lib/retirement` internals to call the standalone **Monte-Carlo service** (richer lifecycle
fan chart) — see `docs/monte-carlo-integration-plan.md`. The page + `/api/retirement/project`
contract stay unchanged. When inputs stabilize, add a `RetirementPlan` model for saved scenarios.

## Note (not an app bug)
A console/overlay error `Failed to connect to MetaMask … chrome-extension://nkbihfbeogaeaoehlefnkodbefgpgknn/scripts/inpage.js`
comes from the **MetaMask browser extension** injecting into every page — the app has **no web3
code**. Harmless; disable MetaMask for localhost to silence it.
