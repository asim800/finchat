# Plan: Phase 4 (A + B) — MC service in-repo + `lib/mc` capability

*(Canonical phased plan is `docs/phased-plan.md` Phase 4; full integration detail in
`docs/monte-carlo-integration-plan.md`. The Phase 3.5 plan that previously occupied this
file shipped in commit `0877ca21` and is no longer needed here.)*

## Context

Phase 4 has four parts in the canonical plan:
- **A.** Move the standalone Python MC simulation service into the repo at
  `services/monte-carlo-service/` (port 8001).
- **B.** Wire a typed `lib/mc` client + `/api/mc/*` HTTP face in the frontend.
- **C.** Build a power-user sandbox page at `/dashboard/monte-carlo` consuming
  `lib/mc` to render the fan chart.
- **D.** Upgrade `lib/retirement`'s internals to call the MC service through the
  same `RetirementResult` contract — the retirement *page* doesn't change.

**This plan covers only A + B**, per user's stated cadence preference. C and D
are explicitly deferred:
- C ships after A+B verify cleanly and we want a visible consumer for the new
  endpoint.
- D waits for user input from the (future) Directory→MC page exploration before
  swapping the retirement engine.

**Decisions confirmed this session:**
- Shipping cadence: **A+B together; C+D as follow-up PRs.**
- (For D when it ships) Band mapping: **p5/p95 honest 90% band** (wider, honest about
  sequence-of-returns risk; recorded here so the future-D plan doesn't re-litigate it).
- (For D when it ships) Retirement UX: **silent swap** is *not* the choice — keep
  deterministic for now; revisit after Directory→MC user feedback.

The integration plan at `docs/monte-carlo-integration-plan.md` has the full
architectural rationale. This file is the precise execution plan for A+B only.

## Part A — Move MC service into the repo (`services/monte-carlo-service/`)

**Source:** `/home/saahmed1/coding/python/fin/projects/portfolio/` (not a git repo —
nothing is lost when we copy).

### What to bring (copy verbatim)

- `src/` — the whole tree (engine + montecarlo + api + data + config + strategies +
  visualization + metrics + utils). The FastAPI's import paths assume `src/` at the
  root, so wholesale copy keeps it runnable.
- `pyproject.toml` — Python deps and build config.
- `uv.lock` — pinned dep tree.
- `.python-version` — Python 3.12 (matches project convention per CLAUDE.local.md).
- `configs/` — example configs.
- `tests/` — keep (small, useful for sanity).
- `docs/` — keep (engine internals docs).

### What to exclude (do NOT copy)

- `mcapp/` — disposable vanilla-JS UI, replaced by Part C later.
- `.venv/` — local virtualenv; user re-creates via `uv sync`.
- `node_modules/` — only relevant to `mcapp/`.
- `output/`, `plots/`, `__pycache__/`, `.ipython/`, `.pytest_cache/` — build/run artifacts.
- `examples/` — sample data files; defer until needed.
- `.claude/` — IDE-specific; user's own config doesn't belong in this project.

### Verification of the moved service

1. `cd services/monte-carlo-service && uv sync` (first run is slow due to heavy
   deps like cvxpy, scikit-learn — acceptable; trimming deps is deferred).
2. `uv run uvicorn src.api.main:app --host 0.0.0.0 --port 8001` (background).
3. `curl http://localhost:8001/health` → expect `200 OK` + JSON heartbeat.
4. Sample simulation: `curl -X POST http://localhost:8001/api/mc/simulate -H
   "Content-Type: application/json" -d '{...minimal valid config...}'` →
   expect `200 OK` with `MCSimulationResponse` JSON containing `accumulation` and
   `decumulation` fan-chart data. (Needs internet for yfinance historical pulls.)

### Docs updates

- `CLAUDE.md` "Backend Services" section: add a bullet:
  > **Monte Carlo service**: `services/monte-carlo-service/` — port 8001 — Python
  > FastAPI, lifecycle simulation engine, `POST /api/mc/simulate`. Run with
  > `uv run uvicorn src.api.main:app --port 8001`.

### What we do NOT do in Part A

- **Don't trim heavy deps** (pyqt5, ipython, matplotlib, ipdb, cvxpy). They're
  bundled but the API doesn't import them at runtime. Trimming is a follow-up.
- **Don't delete the original** `/home/saahmed1/coding/python/fin/projects/portfolio/`.
  User deletes manually after verification.
- **Don't change MC service code.** Copy as-is. Any tweaks happen in a follow-up.
- **Don't deploy to prod.** Local-only `:8001` for now; mirror the
  `fastapi-portfolio-service` Vercel pattern when needed.

## Part B — `lib/mc` capability + `/api/mc/*` HTTP face

The frontend gets a typed client + a thin route handler. No UI consumer in this
PR — that's Part C. We verify Part B with `tsc`, in-process smoke (call the
endpoint via fetch from a test script), and the existing FastAPI client pattern
in `frontend/src/lib/fastapi-client.ts`.

### Env config

- Add `MC_SERVICE_URL=http://localhost:8001` to `frontend/.env.local` (and
  `frontend/.env.example` if it exists).

### Types — `frontend/src/lib/mc/types.ts`

TS mirror of the request/response shapes we actually use. **NOT a full mirror** of
the Python `MCConfigRequest` (which has ~15 optional fields most of which we'll
hide); just the surface needed today.

```ts
export interface TickerWeight { symbol: string; weight: number; }

export interface MCConfigRequest {
  // Required
  initial_portfolio_value: number;
  retirement_date: string;         // YYYY-MM-DD
  simulation_horizon_years: number;
  tickers: TickerWeight[];
  // Optional (defaulted by the service when omitted)
  annual_withdrawal_amount?: number;
  num_simulations?: number;
  inflation_rate?: number;
  // ... add fields as needed
}

export interface FanChartPoint {
  period: number;
  date: string;          // YYYY-MM-DD
  p5: number; p25: number; p50: number; p75: number; p95: number;
  mean?: number;
}

export interface FanChartData {
  data: FanChartPoint[];
  phase: 'accumulation' | 'decumulation';
  sampling_method: 'parametric' | 'bootstrap';
}

export interface MCSimulationResponse {
  success: boolean;
  metadata: { /* exec_time_ms, num_simulations, etc. */ };
  accumulation: Record<string, FanChartData>;        // keyed by sampling_method
  decumulation: Record<string, FanChartData>;
  success_rates: Record<string, number>;
  percentiles_at_retirement: Record<string, Record<string, number>>;
  percentiles_at_horizon: Record<string, Record<string, number>>;
  error?: string;
}
```

### Client — `frontend/src/lib/mc/mc-client.ts`

```ts
const baseUrl = process.env.MC_SERVICE_URL ?? 'http://localhost:8001';

export async function runSimulation(config: MCConfigRequest): Promise<MCSimulationResponse> {
  return httpPost<MCSimulationResponse>(
    `${baseUrl}/api/mc/simulate`,
    config,
    { timeoutMs: 60_000, networkErrorLabel: 'MC service unavailable' },
  );
}
```

### Portfolio-to-config mapping — `frontend/src/lib/mc/portfolio-to-config.ts`

**The "tweak for end user" piece.** A `Portfolio` (saved holdings) → `MCConfigRequest`:

```ts
export function portfolioToConfig(
  portfolio: Portfolio,
  lifecycle: { retirementDate: string; horizonYears: number; annualWithdrawal: number },
): MCConfigRequest {
  const totalValue = portfolio.assets.reduce(
    (sum, a) => sum + (a.price ? a.quantity * a.price : 0), 0
  );
  if (totalValue <= 0) throw new Error('Portfolio has no priced assets');

  // Each holding → {symbol, weight}; normalize to sum exactly 1.0 (validator enforces).
  const rawWeights = portfolio.assets
    .filter(a => a.price && a.price > 0)
    .map(a => ({ symbol: a.symbol, weight: (a.quantity * a.price!) / totalValue }));
  const tickers = normalizeWeights(rawWeights);

  return {
    initial_portfolio_value: totalValue,
    retirement_date: lifecycle.retirementDate,
    simulation_horizon_years: lifecycle.horizonYears,
    annual_withdrawal_amount: lifecycle.annualWithdrawal,
    tickers,
  };
}
```

Edge cases to document in code comments:
- Cash & HSA-as-cash accounts (no priced assets) → skipped for v1; the MC engine
  requires ticker-weighted holdings.
- Real Estate + Mortgage accounts → already excluded by Portfolio's existing asset
  selection.
- Single-asset portfolio → still valid (one ticker, weight 1.0).

### Barrel — `frontend/src/lib/mc/index.ts`

Re-exports the public surface.

### HTTP face — `frontend/src/app/api/mc/simulate/route.ts`

Thin wrapper, no business logic:

```ts
POST /api/mc/simulate body: { portfolioId?: string; lifecycle: { ... } }
- getUserFromRequest → user
- PortfolioService.getPortfolioWithMarketValues(user.id, portfolioId)
  (or default portfolio if not specified)
- portfolioToConfig(portfolio, lifecycle)
- runSimulation(config)
- return MCSimulationResponse
- Errors: 401 missing user, 400 missing/invalid portfolio, 502 MC service down,
  500 other.
```

This is the same hybrid contract pattern used by `lib/accounts` /
`lib/income` / `lib/retirement` — page consumers call the HTTP endpoint; future
server-side reuse (Part D) imports the typed client directly.

### Verification of Part B

1. `tsc --noEmit` — baseline 149 errors preserved; zero new errors in any new file.
2. Architecture honesty: `grep "from '@/lib/" frontend/src/lib/mc/` should show
   only `lib/http` imports (no other capability internals).
3. In-process smoke (with the MC service running on :8001):
   ```ts
   import { runSimulation, portfolioToConfig } from '@/lib/mc';
   import { PortfolioService } from '@/lib/portfolio-service';

   const portfolio = await PortfolioService.getPortfolioWithMarketValues(userId, portfolioId);
   const config = portfolioToConfig(portfolio, {
     retirementDate: '2050-01-01', horizonYears: 30, annualWithdrawal: 40000,
   });
   const result = await runSimulation(config);
   console.log('p50 at retirement:', result.percentiles_at_retirement['parametric']?.['50']);
   console.log('success_rate:', result.success_rates['parametric']);
   ```
   Expect: a fan chart with ~30 years of accumulation + decumulation points;
   reasonable percentile numbers given the portfolio's risk profile.
4. Endpoint smoke (curl with auth cookie):
   ```bash
   curl -X POST http://localhost:3000/api/mc/simulate \
     -H "Content-Type: application/json" -b "auth-token=..." \
     -d '{"lifecycle":{"retirementDate":"2050-01-01","horizonYears":30,"annualWithdrawal":40000}}'
   ```
   Expect: 200 OK with `MCSimulationResponse` JSON.

## Files

**New (5 + service dir)**:
- `services/monte-carlo-service/` (full service tree, copied from external project)
- `frontend/src/lib/mc/types.ts`
- `frontend/src/lib/mc/mc-client.ts`
- `frontend/src/lib/mc/portfolio-to-config.ts`
- `frontend/src/lib/mc/index.ts`
- `frontend/src/app/api/mc/simulate/route.ts`

**Edited (2)**:
- `CLAUDE.md` — add MC service to "Backend Services" section.
- `frontend/.env.local` (and `.env.example` if present) — add `MC_SERVICE_URL`.

**Reused (read-only)**:
- `lib/http` (`httpPost`)
- `lib/auth` (`getUserFromRequest`)
- `lib/portfolio-service` (`PortfolioService.getPortfolioWithMarketValues`)

## Discipline

- **No business logic in the page or route.** The route handler is thin
  (auth + load → transform → call → return). All composition lives in
  `lib/mc` (config mapping) and the external Python service (the math).
- **Hybrid contract**: client components call `POST /api/mc/simulate`;
  server-side consumers (Part D when it ships) call `runSimulation` directly.
- **No god-file growth** in this PR. The existing portfolio-table /
  multi-portfolio-manager / asset-addition-wizard files are not touched.
- **Don't trim deps yet.** Heavy `pyqt5`/`matplotlib`/`ipython` stay until a
  follow-up; they don't break the API, just slow `uv sync`.

## Out of scope (explicit)

- **Part C — sandbox page** at `/dashboard/monte-carlo`. Ships next PR; the
  Directory already lists it as "Coming soon".
- **Part D — retirement upgrade**. Deferred until user feedback from C lands.
- **MC service prod deployment.** Local-only `:8001` for now.
- **Dep trimming.** Heavy unused deps stay; trim later.
- **Deleting** `/home/saahmed1/coding/python/fin/projects/portfolio/`. User
  decides after verification; this plan doesn't.
- **Sampling-method toggle, sweeps, grid sweeps, jobs API.** The MC service
  exposes them at /api/mc/sweep etc.; we don't surface them yet.

## Risks / notes

- **First `uv sync` is slow** (cvxpy compile, scikit-learn build). Expect 1-3
  minutes on first install. Subsequent installs are fast.
- **`/api/mc/simulate` needs internet** for yfinance historical data. If the
  user is offline the call fails with a clear error.
- **Two MC implementations now coexist in the repo**: the simple per-asset MC
  in `services/fastapi-portfolio-service` (`/portfolio/monte-carlo`, wired to
  chat) and this richer lifecycle one. Keep separate; consider retiring the
  simple one later — out of scope for this PR.
- **Pricing source consistency**: `portfolioToConfig` uses `asset.price` from
  the loaded Portfolio object. After commit `a7b76532`, that field falls back
  to the stored seeded price when yfinance misses — so seed users get sensible
  weights instead of all-zero. Good.
- **Empty / all-cash portfolios**: `portfolioToConfig` throws if `totalValue <= 0`.
  Route handler returns 400 with a clear message.
- **Don't `npm run build`** during verification (clobbers dev `.next` cache).
  Use `tsc --noEmit` + the running dev server.
- **Restart `npm run dev`** after adding `MC_SERVICE_URL` to `.env.local`.
  Env-var changes don't HMR.

## Verification checklist

1. `cd services/monte-carlo-service && uv sync` clean.
2. `uv run uvicorn src.api.main:app --port 8001` starts; `curl /health` returns 200.
3. Sample MC sim via direct curl returns valid `MCSimulationResponse`.
4. `cd frontend && npx tsc --noEmit` → 149 baseline preserved.
5. In-process smoke for `runSimulation()` returns non-empty `accumulation` data.
6. Endpoint smoke via `curl POST /api/mc/simulate` with auth cookie returns 200.
7. CLAUDE.md updated; `.env.local` updated.
8. Original external `/portfolio/` directory still intact (user decides cleanup).
