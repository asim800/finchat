# Plan — Surface Monte Carlo Simulation to End Users

*Status: proposed (for review). Branch: `retire` (current).*

## Context
There's a mature, standalone Monte Carlo **lifecycle** simulation system at
`/home/saahmed1/coding/python/fin/projects/portfolio/`:
- A real Python engine — `src/montecarlo/`, `src/engine/`, `src/strategies/`, `src/metrics/`.
- A clean FastAPI over it — `src/api/main.py`, routes under `/api/mc/*` (port 8001).
- It already returns **Recharts-ready fan-chart data** and its CORS already allows
  `http://localhost:3000` (it was built to be driven by a JS frontend).
- A disposable vanilla-JS UI — `mcapp/` (Express proxy + `public/js/app.js`).

**Goal:** show this to end users *inside finance-app*, optimizing for the three stated
priorities: **(1) keep it modular, (2) cut everything end users don't care about, (3) tweak
it to fit a real user.**

**Approach (decided):** integrate as a **separate service moved into this repo** (so all
app code lives together) + a **native, disposable React page** over it. This is the
"capability (stable, endpoint-backed) + experience (throwaway page)" pattern, and doubles as
the worked example for that broader architecture.

---

## Keep vs. throw away (priority #2)

**Keep — what users care about:**
- One simulation of *their* portfolio → the **fan chart** (range of outcomes over time).
- 2–3 plain-language knobs: **time horizon**, **annual withdrawal**; initial value
  auto-filled from their portfolio (editable).

**Throw away from the UI** (developer-facing; stays in the service for later, just not
surfaced):
- Parameter **sweeps** and 2-D **grid-sweeps** (research tooling).
- **Jobs + progress-polling** (an implementation detail of long runs).
- **Sampling-method toggle** (parametric/bootstrap/both) — default it, hide it.
- **Config schema / validation** endpoints (internal plumbing).

---

## The contract (what makes the "tweak" possible)
`POST /api/mc/simulate` takes an `MCConfigRequest`:
- **Required:** `initial_portfolio_value`, `retirement_date` (YYYY-MM-DD),
  `simulation_horizon_years`, `tickers` (list of `{symbol, weight}` — **weights must sum to 1.0**).
- **Defaulted (we hide these):** `num_simulations=1000`, `simulation_frequency=weekly`,
  `sampling_method=both`, `annual_withdrawal_amount=40000`, `inflation_rate=0.03`,
  `withdrawal_strategy=constant_inflation_adjusted`, historical `start/end_date`, `seed=42`.

So a user's saved holdings map cleanly onto the required fields; everything quant-y is defaulted.

---

## Plan

### Part A — Move the MC system into the repo as a service
Copy into **`services/monte-carlo-service/`** (the source is not a git repo, so nothing is lost):
- **Bring:** `src/` (engine + api), `pyproject.toml`, `uv.lock`, `.python-version`, `configs/`.
  Optional: `tests/`, `docs/`.
- **Exclude:** `mcapp/` (replaced by the React page), `node_modules/`, `.venv/`, `output/`,
  `plots/`, `examples/`, `__pycache__/`, `.ipython/`, `.pytest_cache/`.
- Runs unchanged: `uv run uvicorn src.api.main:app --host 0.0.0.0 --port 8001` from the
  service dir (the API uses relative imports rooted at `src/`, so a wholesale `src/` copy
  stays runnable).
- Update `CLAUDE.md` "Backend Services" to list the new service (port 8001).
- *Follow-up (not now):* trim API-irrelevant deps (`pyqt5`, `matplotlib`, `ipython`, `ipdb`).
- Once verified running from the repo, the original `/portfolio/` copy can be deleted.

### Part B — finance-app `monte-carlo` capability (hybrid contract)
- **Config:** add `MC_SERVICE_URL` (default `http://localhost:8001`) to `frontend/.env.local`.
- `frontend/src/lib/mc/types.ts` — TS mirror of `MCConfigRequest` + `MCSimulationResponse`.
- `frontend/src/lib/mc/mc-client.ts` — typed client over the shared `lib/http`:
  `runSimulation(config) → POST ${MC_SERVICE_URL}/api/mc/simulate`.
- `frontend/src/lib/mc/portfolio-to-config.ts` — **the "tweak for end user" mapping**:
  `Portfolio` (saved holdings) → `MCConfigRequest`:
  - `tickers` = each holding → `{symbol, weight=marketValue/total}`, **normalized to sum 1.0**,
  - `initial_portfolio_value` = portfolio total market value,
  - lifecycle params from the page's knobs; the rest left to schema defaults.
- `frontend/src/app/api/mc/simulate/route.ts` — thin endpoint:
  `getUserFromRequest` → load holdings via `PortfolioService` → `portfolioToConfig` →
  `mcClient.runSimulation` → return. (Pages call this endpoint; server-side reuse uses the
  typed client — the hybrid contract.)

### Part C — the experience (disposable page)
- `frontend/src/app/dashboard/monte-carlo/page.tsx` + colocated `_components/`
  (Next.js private folder → stays page-local and throwaway-safe).
- Small form: **time horizon (yrs)**, **annual withdrawal**, initial value (auto from
  portfolio, editable). Submit → `/api/mc/simulate` via `lib/http`.
- Render the **fan chart** with **Recharts AreaChart** (data already RechartsFormatter-shaped
  by the service). Loading / empty / error states; native dark-mode theme.
- Holdings source: **logged-in user's saved portfolio**.
- Optional: a dashboard nav entry.

---

## Reuse (don't reinvent)
`lib/http` (shared client), `lib/auth` (`getUserFromRequest`), `lib/portfolio-service`
(holdings), `components/ui` + Recharts (already used by `ChartDisplay`).

## Verification
1. **MC service:** from `services/monte-carlo-service/`: `uv sync`;
   `uv run uvicorn src.api.main:app --port 8001`; `curl /health`;
   `curl -XPOST /api/mc/simulate` with a sample config (e.g. SPY/BND weights summing to 1,
   horizon 30) → expect fan-chart JSON. *(Needs internet for yfinance history.)*
2. **finance-app:** `npm run dev`; log in as a user with holdings; visit
   `/dashboard/monte-carlo`; run a sim; confirm the fan chart renders and the Next endpoint
   reached :8001 (service logs).
3. Playwright end-to-end walkthrough; confirm dark mode.

## Risks / notes
- MC config is retirement-shaped → we default lifecycle params and expose 2–3; weights must
  normalize to 1.0 (validator enforces).
- Heavy deps (`cvxpy`, `scikit-learn`) → first `uv sync` is slow; `pyqt5`/`matplotlib` are
  unused by the API (trim later).
- Confirm `/simulate` with defaults needs **no external data files** (params
  `simulated_*_file` default to None → computed from yfinance history). Verified in step 1.
- Two MC implementations will coexist: the simple one in `fastapi-portfolio-service`
  (`/portfolio/monte-carlo`, already wired into chat) and this richer lifecycle one. Keep
  them separate; consider retiring/redirecting the simple one later (out of scope).

---

## Decisions (pilot defaults — all low-stakes & reversible)
- **Role:** this is the **pilot** for the capabilities-vs-pages architecture
  (`docs/architecture-capabilities-and-pages.md`) — build it first, generalize after.
- **Scope:** single simulation + fan chart only. Sweeps / grid / jobs / sampling toggle
  deferred (stay in the service, not surfaced).
- **Deployment:** **local-only (`:8001`) for now** — enough to show end users in dev; prod
  deploy deferred as a follow-up (mirror `fastapi-portfolio-service` when needed).
- **Nav placement:** standalone **`/dashboard/monte-carlo`** with a nav entry; easy to
  relocate later.
- **Holdings:** logged-in user's saved portfolio.
