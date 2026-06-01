# Portfolio Monte Carlo Simulator — User Guide

> **Canonical usage guide.** This document supersedes the older `qstart.md` and
> `MC_QUICK_REFERENCE.md` (kept only for history). For architecture/internals, see the
> project `CLAUDE.md`.

A portfolio **lifecycle simulation** tool for retirement planning. It answers questions
like:

> *"If I start with \$1M, contribute \$0 biweekly until I retire in 2034, then withdraw
> \$40K/year (inflation-adjusted) for 20 years — what's the probability my money lasts?"*

It simulates two phases — **accumulation** (working years, contributions + employer match)
and **decumulation** (retirement withdrawals) — across many Monte Carlo paths, and reports
percentile outcomes and a **success rate**.

The tool has three surfaces, all documented below:

| Surface | Use it for | Entry point |
|---|---|---|
| **CLI** (`run_mc.py`) | Scripted/batch runs, parameter sweeps, reproducible output files | `python -m projects.portfolio.src.run_mc` |
| **REST API** (FastAPI) | Programmatic access, integrations, async jobs | `uvicorn ...api.main:app` (port 8001) |
| **Web UI** (Node/Express) | Interactive point-and-click exploration | `mcapp/` (port 3000) |

---

## 1. Prerequisites & the golden rule

> **⚠️ Always run commands from the workspace root (`fin/`) using `uv run`.**
> The module path `projects.portfolio.src...` only resolves from the root, and running
> `uv` from inside a subproject can spawn a stray `.venv` that shadows the shared
> environment. If you see `ModuleNotFoundError: No module named 'projects'` or `'findata'`,
> you're in the wrong directory (or a stray `.venv` exists — `rm -rf projects/portfolio/.venv`).

One-time setup from the workspace root `/home/saahmed1/coding/python/fin`:

```bash
uv sync --extra dev --extra ml
```

---

## 2. Quickstart

Run a single simulation with the example config:

```bash
uv run python -m projects.portfolio.src.run_mc \
  --config configs/portfolio/test_simple_buyhold.json
```

This prints percentile tables and a success rate, and writes:

- `output/mc/mc_results.csv` — percentile + success-rate table
- `output/mc/mc_lifecycle.png` — 6-panel lifecycle visualization

See the full `--help`:

```bash
uv run python -m projects.portfolio.src.run_mc --help
```

---

## 3. CLI reference (`run_mc.py`)

| Flag | Alias | Type / default | Description |
|---|---|---|---|
| `--config` | `-c` | str, **required** | Path to the JSON config file (e.g. `configs/portfolio/test_simple_buyhold.json`). |
| `--sims` | `-n` | int, default = config's `num_mc_simulations` | Number of Monte Carlo paths (overrides the config). |
| `--seed` | | int, default `42` | Random seed for reproducibility. |
| `--sweep` | | flag | Enable parameter-sweep mode (see §5–6). |
| `--sweep-param` | | str | First parameter to sweep (1D). One of the sweepable params below. |
| `--sweep-start` | | str | First-param start value. Omit to use the registry default range. |
| `--sweep-end` | | str | First-param end value. Omit for default. |
| `--sweep-step` | | str | First-param step. Number, or `1Y` / `1M` for date params. Omit for default. |
| `--sweep-param2` | | str | Second parameter — adds a dimension → **2D grid sweep**. |
| `--sweep2-start` | | str | Second-param start value. |
| `--sweep2-end` | | str | Second-param end value. |
| `--sweep2-step` | | str | Second-param step value. |
| `--output` | `-o` | str, default `output/mc` | Output directory for CSVs and plots. |
| `--no-plot` | | flag | Skip PNG generation (CSVs still written). |
| `--no-bootstrap` | | flag | Parametric sampling only — skip bootstrap. |

### Sampling: parametric vs bootstrap (automatic)

There is **no `--method` flag**. The tool decides automatically:

- **Parametric** — samples returns from a multivariate Gaussian using the mean/covariance
  in `simulated_mean_returns_file` / `simulated_cov_matrices_file` (or historical stats).
  Always runs.
- **Bootstrap** — resamples actual historical Yahoo Finance returns (preserves real market
  behavior). Runs *in addition* to parametric **when historical data loads successfully**.
- If Yahoo data is unavailable, or you pass **`--no-bootstrap`**, only parametric runs.

When both run, results and plots are produced for each (look for `_parametric` and
`_bootstrap` suffixes on sweep plots).

---

## 4. Use case: single simulation

```bash
uv run python -m projects.portfolio.src.run_mc \
  --config configs/portfolio/test_simple_buyhold.json \
  --sims 1000 --seed 7
```

**Outputs** (`output/mc/`):

- `mc_results.csv` — accumulation percentiles (5/25/50/75/95th) at retirement,
  decumulation percentiles at the horizon, and the decumulation **success rate**
  (fraction of paths that never run out of money). Columns include `parametric` and, when
  available, `bootstrap`.
- `mc_lifecycle.png` — accumulation & decumulation paths, percentile fans, success-rate
  comparison, and a summary table.

**How to read it:** the **success rate** is the headline number — the probability the
portfolio survives the full decumulation horizon. The median (50th percentile) ending
value tells you the typical outcome; the 5th percentile is the downside case.

---

## 5. Use case: 1D parameter sweep

Vary **one** parameter and see how outcomes change across its range.

Use the built-in default range:

```bash
uv run python -m projects.portfolio.src.run_mc \
  --config configs/portfolio/test_simple_buyhold.json \
  --sweep --sweep-param annual_withdrawal_amount
```

Specify an explicit range (`start`, `end`, `step`):

```bash
uv run python -m projects.portfolio.src.run_mc \
  --config configs/portfolio/test_simple_buyhold.json \
  --sweep --sweep-param annual_withdrawal_amount \
  --sweep-start 30000 --sweep-end 60000 --sweep-step 10000
```

Sweep a **date** parameter (step uses `1Y` / `1M` notation):

```bash
uv run python -m projects.portfolio.src.run_mc \
  --config configs/portfolio/test_simple_buyhold.json \
  --sweep --sweep-param retirement_date \
  --sweep-start 2030-01-01 --sweep-end 2040-01-01 --sweep-step 2Y
```

**Outputs** (`output/mc/sweep/`):

- `{param}_sweep.csv` — one row per swept value with percentiles + success rate.
- `{param}_sweep_parametric.png` — fan/line chart across the range. A
  `{param}_sweep_bootstrap.png` is also written when bootstrap runs.

### Sweepable parameters (and default ranges)

| Parameter | Type | Default range (start → end, step) |
|---|---|---|
| `initial_portfolio_value` | currency | 500,000 → 2,000,000, 500,000 |
| `annual_withdrawal_amount` | currency | 20,000 → 80,000, 10,000 |
| `contribution_amount` | currency | 0 → 5,000, 500 |
| `inflation_rate` | percentage | 0.01 → 0.06, 0.01 |
| `retirement_date` | date | 2027-01-01 → 2039-01-01, 1Y |
| `simulation_horizon_years` | numeric | 15 → 30, 5 |
| `employer_match_rate` | percentage | 0.0 → 0.10, 0.02 |

> You can also define sweeps in the config file under `sweep_params` (an array of
> `{name, start, end, step}`) — see the example config — but CLI flags override them.

---

## 6. Use case: 2D grid sweep

Vary **two** parameters together — every combination of param1 × param2 — to map a
sensitivity surface. `--sweep-param` is the first axis (rows), `--sweep-param2` adds the
second axis (columns):

```bash
uv run python -m projects.portfolio.src.run_mc \
  --config configs/portfolio/test_simple_buyhold.json \
  --sweep --sweep-param annual_withdrawal_amount --sweep-param2 inflation_rate
```

This uses each parameter's default range. To set explicit ranges, add the
`--sweep-start/end/step` (axis 1) and `--sweep2-start/end/step` (axis 2) flags:

```bash
uv run python -m projects.portfolio.src.run_mc \
  --config configs/portfolio/test_simple_buyhold.json \
  --sweep \
  --sweep-param annual_withdrawal_amount --sweep-start 30000 --sweep-end 60000 --sweep-step 10000 \
  --sweep-param2 inflation_rate --sweep2-start 0.02 --sweep2-end 0.05 --sweep2-step 0.01
```

> **Sanity check:** the console prints `Grid: <param1> x <param2>` and a
> `Data source: ...` line. Use them to confirm you swept the parameters you intended and
> whether bootstrap ran. If you passed `--no-bootstrap`, expect `Data source: Parametric
> only`; whatever you passed to `--sweep-param` is the row axis. (You can swap in any
> sweepable parameter from the §5 table — e.g. `--sweep-param contribution_amount` to vary
> contributions instead of withdrawals.)

**Outputs** (`output/mc/sweep/`):

- `{param1}_{param2}_grid.csv` — one row per (param1, param2) combination.
- `{param1}_{param2}_grid_parametric.png` — heatmap/matrix of success rates & medians
  (plus `_bootstrap.png` when bootstrap runs).

---

## 7. Configuration reference

Configs are JSON files under `configs/portfolio/`. Paths inside a config (ticker file,
simulated-param files) are resolved **relative to the workspace root**.

### Annotated example (`configs/portfolio/test_simple_buyhold.json`)

```jsonc
{
  // --- Historical data window (used for bootstrap & stats) ---
  "start_date": "2005-01-01",
  "end_date":   "2025-09-19",
  "ticker_file": "data/tickers/default.txt",   // CSV: Symbol,Weight
  "risk_free_rate": 0.02,

  // --- Lifecycle dates ---
  "mc_start_date": "2025-10-01",               // accumulation begins (defaults to end_date)
  "retirement_date": "2034-01-01",             // REQUIRED for MC: end of accumulation
  "simulation_horizon_years": 20,              // decumulation length (XOR simulation_horizon_date)
  "simulation_horizon_date": null,
  "initial_portfolio_value": 1000000,
  "simulation_frequency": "weekly",            // path step: weekly / biweekly / monthly / ...

  // --- Accumulation (contributions) ---
  "contribution_amount": 0,
  "contribution_frequency": "biweekly",        // weekly / biweekly / monthly / annual
  "employer_match_rate": 0.0,                  // 0–1 (e.g. 0.5 = 50% match)
  "employer_match_cap": 10000,

  // --- Decumulation (withdrawals) ---
  "withdrawal_strategy": "constant_inflation_adjusted",
  "annual_withdrawal_amount": 40000,
  "withdrawal_percentage": null,
  "withdrawal_frequency": "biweekly",
  "inflation_rate": 0.03,                      // 0–0.20
  "withdrawal_strategy_params": {},

  // --- Monte Carlo ---
  "num_mc_simulations": 100,
  "use_simulated_data": true,                  // use Gaussian params instead of pure history
  "mc_reindex_method": "ffill",                // ffill | interpolate
  "simulated_mean_returns_file": "configs/shared/simulated_mean_returns.csv",
  "simulated_cov_matrices_file": "configs/shared/simulated_cov_matrices.txt",

  // --- Optional: config-defined sweeps (CLI flags override these) ---
  "sweep_params": [
    { "name": "initial_portfolio_value", "start": 500000, "end": 2000000, "step": 500000 },
    { "name": "annual_withdrawal_amount", "start": 20000,  "end": 80000,    "step": 10000 }
  ]
}
```

### Field notes

- **Required for an MC run:** `retirement_date` **plus exactly one** of
  `simulation_horizon_years` or `simulation_horizon_date` (specifying both errors).
- **`withdrawal_strategy`** ∈ `constant_inflation_adjusted`, `constant_percentage`,
  `guyton_klinger`, `vpw`, `floor_ceiling`, `rmd`. Use `annual_withdrawal_amount` with the
  constant strategies; `withdrawal_percentage` with percentage-based ones.
- **Frequencies:** `simulation_frequency` is typically `weekly` or `biweekly`.
  `contribution_frequency` / `withdrawal_frequency` ∈ `weekly`, `biweekly`, `monthly`,
  `annual` (periods/year: 52 / 26 / 12 / 1).

### Other available configs (`configs/portfolio/`)

| File / dir | Purpose |
|---|---|
| `test_simple_buyhold.json` | Primary MC lifecycle example (used throughout this guide). |
| `system_config_with_retirement.json` | System config with a retirement MC phase. |
| `system/` | Backtest-only system config (no MC). |
| `portfolios/` | Individual strategy configs (buy-and-hold, 60/40, optimized, SPY benchmark, …). |
| `comparisons/` | Multi-strategy comparison configs. |
| `templates/` | Starting-point templates. |

---

## 8. Use case: REST API (FastAPI)

Start the server **from the workspace root**:

```bash
uv run uvicorn projects.portfolio.src.api.main:app --host 0.0.0.0 --port 8001
```

- Interactive docs (Swagger): <http://localhost:8001/docs> · ReDoc: `/redoc`
- Health check: <http://localhost:8001/health> → `{"status":"healthy","service":"mc-simulation-api"}`

### Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Liveness check. |
| `POST` | `/api/mc/simulate` | Run a single MC simulation. |
| `POST` | `/api/mc/sweep` | 1D parameter sweep. |
| `POST` | `/api/mc/grid-sweep` | 2D grid sweep. |
| `GET` | `/api/mc/config/sweep-params` | List sweepable parameters + default ranges. |
| `POST` | `/api/mc/config/validate` | Validate a config before running. |
| `GET` | `/api/mc/config/schema` | JSON schema for `MCConfigRequest` (form generation). |
| `GET` | `/api/mc/jobs/{job_id}` | Poll an async job. |
| `POST` | `/api/mc/jobs/{job_id}/cancel` | Cancel a job. |
| `GET` | `/api/mc/jobs` | List jobs (optional `?status=` filter). |

### Request schemas (`src/api/schemas/config.py`)

**`MCConfigRequest`** — required: `initial_portfolio_value`, `retirement_date`,
`simulation_horizon_years` (1–50), `tickers` (list of `{symbol, weight}`, weights must
sum to 1.0 ±1%). Notable optionals: `start_date`/`end_date`, `num_simulations` (10–50000,
default 1000), `simulation_frequency` (daily/weekly/biweekly/monthly/quarterly/annual),
`sampling_method` (`parametric` | `bootstrap` | `both`, default `both`), `seed`,
contribution/withdrawal fields, `inflation_rate`, and `async_mode` (default false).

**`ParameterSweepRequest`** (1D) — `base_config` (an `MCConfigRequest`), `param_name`, and
**either** `param_values: [...]` **or** `param_range: {start, end, step}`; optional
`skip_bootstrap`.

**`GridSweepRequest`** (2D) — `base_config`, `param1_name` + (`param1_values` |
`param1_range`), `param2_name` + (`param2_values` | `param2_range`), optional
`skip_bootstrap`.

### Examples

Single simulation:

```bash
curl -s -X POST http://localhost:8001/api/mc/simulate \
  -H 'Content-Type: application/json' \
  -d '{
    "initial_portfolio_value": 1000000,
    "retirement_date": "2034-01-01",
    "simulation_horizon_years": 20,
    "annual_withdrawal_amount": 40000,
    "num_simulations": 500,
    "sampling_method": "parametric",
    "tickers": [
      {"symbol": "SPY", "weight": 0.6},
      {"symbol": "AGG", "weight": 0.4},
      {"symbol": "NVDA", "weight": 0.0},
      {"symbol": "GLD",  "weight": 0.0}
    ]
  }'
```

1D sweep:

```bash
curl -s -X POST http://localhost:8001/api/mc/sweep \
  -H 'Content-Type: application/json' \
  -d '{
    "base_config": { "...": "same fields as MCConfigRequest above" },
    "param_name": "annual_withdrawal_amount",
    "param_range": { "start": 30000, "end": 60000, "step": 10000 }
  }'
```

2D grid sweep:

```bash
curl -s -X POST http://localhost:8001/api/mc/grid-sweep \
  -H 'Content-Type: application/json' \
  -d '{
    "base_config": { "...": "MCConfigRequest" },
    "param1_name": "annual_withdrawal_amount",
    "param1_range": { "start": 30000, "end": 60000, "step": 10000 },
    "param2_name": "inflation_rate",
    "param2_range": { "start": 0.02, "end": 0.05, "step": 0.01 }
  }'
```

### Async jobs

For long runs, set `"async_mode": true` in the simulate request. The call returns a
`job_id` immediately; then poll:

```bash
curl -s http://localhost:8001/api/mc/jobs/<job_id>
```

Job `status` progresses `pending → running → completed` (or `failed`/`cancelled`). When
`completed`, the `result` field holds the full simulation response. Cancel with
`POST /api/mc/jobs/<job_id>/cancel`. Jobs are stored in memory and cleaned up after ~1 hour.

> CORS is preconfigured for the Node UI origins (`http://localhost:3000`, `:3001`).

---

## 9. Use case: web UI (`mcapp/`)

A point-and-click front end that talks to the API.

```bash
# Terminal 1 — backend (from workspace root)
uv run uvicorn projects.portfolio.src.api.main:app --host 0.0.0.0 --port 8001

# Terminal 2 — frontend
cd projects/portfolio/mcapp
npm install      # first time only
npm start        # or: npm run dev  (auto-reload)
```

Open <http://localhost:3000>. The Express server proxies `/api/*` and `/health` to the
backend on port 8001 (override with the `API_URL` env var; UI port via `PORT`).

The page is organized into fieldsets — **Portfolio** (initial value, tickers + weights),
**Time** (retirement date, horizon, historical range), **Accumulation** (contributions,
employer match), **Decumulation** (withdrawal strategy, amount, inflation), **Simulation**
(num sims, frequency, sampling method, seed), and **Parameter Sweep** (enable, param 1 for
1D, add param 2 for 2D, skip-bootstrap). Results render as fan charts (accumulation &
decumulation), a 1D sweep line chart + table, a 2D success-rate heatmap, and a jobs panel
for async runs.

---

## 10. Outputs reference

| Mode | Files (under `--output`, default `output/mc/`) |
|---|---|
| Single run | `mc_results.csv`, `mc_lifecycle.png` |
| 1D sweep | `sweep/{param}_sweep.csv`, `sweep/{param}_sweep_parametric.png` (+ `_bootstrap.png`) |
| 2D grid | `sweep/{p1}_{p2}_grid.csv`, `sweep/{p1}_{p2}_grid_parametric.png` (+ `_bootstrap.png`) |

`--no-plot` skips the PNGs; CSVs are always written.

---

## 11. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `ModuleNotFoundError: No module named 'projects'` or `'findata'` | Not running from the workspace root, or a stray `projects/portfolio/.venv` exists. Run from `fin/` via `uv run`; if needed `rm -rf projects/portfolio/.venv` and `uv sync --extra dev --extra ml`. |
| Bootstrap shows absurd (billions) values | Frequency mismatch in historical resampling — verify the config `simulation_frequency`. |
| Success rate is 0% or 100% | Unrealistic parameters — check mean returns (~0.05–0.15) and withdrawal/inflation. |
| Yahoo Finance errors / rate limiting | Delete `data/cache/*` and retry later, or use `--no-bootstrap` for parametric-only. |
| Wrong columns / stale data | Clear the cache: `rm data/cache/*.csv data/cache/*.pkl`. |
| "Mean error too large" in validation | Random variation — re-run with a different `--seed`. |

---

## 12. Quick command index

```bash
# from workspace root, after: uv sync --extra dev --extra ml

# single run
uv run python -m projects.portfolio.src.run_mc -c configs/portfolio/test_simple_buyhold.json

# 1D sweep (default range)
uv run python -m projects.portfolio.src.run_mc -c configs/portfolio/test_simple_buyhold.json \
  --sweep --sweep-param annual_withdrawal_amount

# 2D grid sweep
uv run python -m projects.portfolio.src.run_mc -c configs/portfolio/test_simple_buyhold.json \
  --sweep --sweep-param annual_withdrawal_amount --sweep-param2 inflation_rate

# REST API
uv run uvicorn projects.portfolio.src.api.main:app --host 0.0.0.0 --port 8001

# Web UI
cd projects/portfolio/mcapp && npm install && npm start   # http://localhost:3000
```
