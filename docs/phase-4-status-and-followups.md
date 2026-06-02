# Phase 4 status + open decisions for morning review

*Written 2026-06-01 EOD, branch `retire` at `700f0e39`.*

## TL;DR — read this if nothing else

1. **Phase 4 Parts A + B + C shipped and verified.** MC Python service lives in-repo
   on port 8001; `lib/mc` capability + `/api/mc/simulate` route are wired; the
   visible sandbox page at `/dashboard/monte-carlo` works end-to-end.
2. **Two sign-in bugs you reported are fixed and verified** (middleware bounce
   removed, button no longer disabled on load).
3. **One real limitation surfaces in Part C** — the MC engine's default
   covariance matrix only knows 4 tickers (SPY / AGG / NVDA / GLD), and the demo
   users' portfolios use different ones (VTI / VXUS / AAPL / MSFT / NVDA). So
   the **success path of the MC page can't be visually demonstrated** with the
   current seed users; clicking Run shows a clean error. **This is a data
   problem, not a code problem.**
4. **Three open decisions** wait for your input — listed in order of
   recommended priority below.

## What's live on `origin/retire` right now

| Phase | What | Commits |
|---|---|---:|
| 0 — Domain reshape | Account types + RealEstateDetails schema + lib/accounts + /api/accounts | shipped earlier |
| 1 — Income | CashFlow schema + lib/income + /api/income + Income page | shipped earlier |
| 2 — Portfolio UI | Accounts inside Portfolios (multi-account, polymorphic forms) + Phase-2 declutter | shipped earlier |
| 3 — Retirement hub | lib/retirement + /api/retirement/project + page + projection chart + readiness | shipped earlier |
| 3.5 — Refactor | Reference profiles (logged-in only) + pull-a-profile + Directory + diagnostic page | shipped earlier |
| **4-A** | **MC Python service** at `services/monte-carlo-service/` on port 8001; vendored `findata` sibling lib; required default data files in `configs/data/` | `c3b599e6` |
| **4-B** | **lib/mc capability**: types + client + portfolio-to-config; thin `/api/mc/simulate` route handler with auth/validation/error mapping | `c3b599e6` |
| **4-C** | **Sandbox page** at `/dashboard/monte-carlo`: 4-input form + Recharts ComposedChart with 5–95% / 25–75% nested bands + median line + success-rate headline + clean error UI. Directory link now live (not "Coming soon"). | `700f0e39` |
| sign-in fixes | middleware no longer bounces authed users away from `/login` (was teleporting to chat); Sign In button no longer disabled on initial load | `700f0e39` |

What's verified end-to-end via Playwright (today):
- Sign-in bug 1a: authed user → /login → form renders (no bounce) ✓
- Sign-in bug 1b: button `disabled: false` on initial render ✓
- Directory: MC link is real `<a>` (0 "Coming soon" badges remain) ✓
- MC page renders cleanly with sensible defaults ✓
- MC API plumbing: auth gate (401), validation (400), MC service call works, error surfaces cleanly in the UI ✓

What's NOT yet verified via Playwright:
- **The success path of the MC page** (rendering a real fan chart) — blocked by the
  ticker-coverage gap below, not by code.

## Decision 1 (highest priority): make the MC sandbox actually show a fan chart

This is the most actionable thing. Right now the page works for everything *except*
the happy path — which is awkward because the happy path is the whole point of
the page.

### The issue

- The MC service's parametric sampler needs a covariance matrix that includes
  every ticker in the request.
- The default cov matrix shipped in `services/monte-carlo-service/configs/data/simulated_cov_matrices.txt`
  has 4 tickers: **SPY, AGG, NVDA, GLD**.
- The 3 seed users hold tickers that don't fully overlap: John has VTI / VXUS /
  AAPL / MSFT / NVDA; Jane has VTSAX / VBTLX / VOO / VXUS / SCHB / SCHF; Jack &
  Jill have VTI / QQQ / FXAIX / FXNAX / VFIAX. **Only NVDA is in both sets.**
- Clicking Run on any demo user's portfolio surfaces:
  `"['VTI', 'VXUS', 'AAPL', 'MSFT'] not in index"`

### Three fix paths (pick one or two)

| Option | Effort | Pros | Cons |
|---|---|---|---|
| **A. Regenerate the cov matrix with broader tickers** | ~30 min | Real solution — any seed user works; users adding new portfolios with common ETFs work too. Uses the existing `tests/generate_simulated_params.py` script which pulls from yfinance. | Need internet for yfinance; first regen takes 1-2 minutes. Larger cov matrix in the repo (~few KB more). |
| **B. Seed a 4th demo user with SPY/AGG/NVDA/GLD** | ~10 min | Quick. Lets us demo the MC success path immediately with a dedicated "MC-ready" persona. | Doesn't help John/Jane/Jack — they still see the error. The new persona is artificial. |
| **C. Implement yfinance fallback in the MC service** | ~60-90 min | Most principled — the engine fetches missing tickers from yfinance on demand. No more manual cov-matrix maintenance. | Touches the Python service code (we agreed not to in Part A). Adds runtime dependency on yfinance availability for every simulation. |
| **A + B together** | ~40 min | Both demo-friendly AND broadly capable. | More to do; biggest commit. |

**My recommendation: A.** Aligns the seed users with what works, fixes the issue
for any future user with common ETF holdings, and doesn't require touching the
MC service Python code. B is a band-aid that doesn't help existing demo users.
C is the right long-term answer but feels like it belongs in a "MC service v2"
plan, not this follow-up.

If you pick A, the steps are:
1. Edit `services/monte-carlo-service/tests/generate_simulated_params.py` (or
   create a fresh script in the right working directory) so the ticker list
   is the union of common ETFs the demo users hold: `SPY, AGG, NVDA, GLD, VTI,
   VXUS, AAPL, MSFT, VTSAX, VBTLX, VOO, SCHB, SCHF, QQQ, FXAIX, FXNAX, VFIAX`.
2. Run it once to regenerate `configs/data/simulated_mean_returns.csv` and
   `configs/data/simulated_cov_matrices.txt`.
3. Verify the MC page now shows a fan chart for John.
4. Commit the new data files.

## Decision 2: Phase 4 Part D — when?

Part D = swap `lib/retirement`'s deterministic simulation for an MC service
call, behind the same `RetirementResult` contract. The retirement page doesn't
change; the chart just gets honest uncertainty bands.

**Already decided** (confirmed in this session, locked in for whenever D ships):
- **Band mapping**: p5 / p95 (the honest 90% band — wider than today's ±2%
  deterministic; matches what MC actually says about sequence-of-returns risk).
- **Retirement UX**: NOT a silent swap. Keep deterministic for now; revisit
  after user input from the Directory → MC page.

**The wait-condition is satisfiable now** — the MC page is live (Part C
shipped), the Directory link works, the sandbox is ready for you to explore.

**Three options for when to do D**:

| Option | What it means |
|---|---|
| **D-now**: Build Part D immediately after Decision 1 | Honest retirement chart, full Phase 4 closed out. |
| **D-after-feedback**: Use the MC sandbox for a few days, get a feel for what the fan chart actually shows, *then* decide whether the retirement chart should swap | Lower-risk; the retirement page is the most-visible surface, and you'd see exactly what MC produces for various inputs before committing. |
| **D-explicit-toggle**: Build D as a "Use Monte Carlo" toggle on the retirement page (not silent swap), giving users a click-to-switch | More UI work but lets users compare deterministic vs MC side-by-side. |

**My recommendation: D-after-feedback.** The whole reason we deferred D was to
give you time with the sandbox. Stick with that plan unless you're confident
about the band mapping after a quick play.

If you do go D-now or D-explicit-toggle, here's the *known unknown*: lib/retirement
today reads raw `asset.price`; the MC client routes through `getPortfolioWithMarketValues`
which applies the price-fallback fix (commit `a7b76532`). The values may differ
slightly for users where yfinance lookup misses. The diagnostic page would
surface any discrepancy. See **Decision 4** below.

## Decision 3: clean up the old external MC source

The Python project at `/home/saahmed1/coding/python/fin/projects/portfolio/` was
the source we copied from. It still exists. The vendored `findata` at
`/home/saahmed1/coding/python/fin/lib/findata/` is also still in place.

**Options**:

| Option | What |
|---|---|
| **Leave both** | Safest if you want a backup. Costs disk space (~few hundred MB total). |
| **Delete `portfolio/`, keep `findata/`** | findata is still useful for your other Python projects (collar, cover, options); only portfolio is fully in-repo now. |
| **Delete both** | Cleanest if you've fully migrated. |

**My recommendation: Delete only `portfolio/`.** It's now redundant; `findata`
is still wired into other projects. I won't touch either without your explicit
go-ahead.

## Decision 4 (lower priority — cosmetic): price-source consistency

This is a real-but-small inconsistency I flagged in earlier docs (see
`docs/phase-3.5-refactor-plan.md` Risks section):

- `lib/portfolio-service.ts` (`getPortfolioWithMarketValues`) applies a fallback:
  yfinance-cached price OR stored `asset.price` (commit `a7b76532`).
- `lib/retirement` reads `asset.price` directly (no fallback).
- `lib/mc/portfolio-to-config.ts` uses `asset.price` from a Portfolio object
  loaded via `getPortfolioWithMarketValues`, so it benefits from the fallback.

**Net effect:** the Retirement page and the MC page may show slightly different
investable totals for the same user when the yfinance cache has been refreshed
since the last time `asset.price` was written. For all 3 demo users today the
values match (yfinance hasn't been the source of truth recently; the seed sets
asset.price directly).

**Fix when needed** (not before): factor the fallback into `lib/retirement`'s
`sumInvestableBalance` so all three paths read the same value. ~10-line change.
The Retirement diagnostic page would surface the discrepancy if it bit a real
user.

## Bonus: MC service dependency trim (deferred from Part A)

`services/monte-carlo-service/pyproject.toml` carries some heavy deps that the
API runtime doesn't actually use:
- `pyqt5` (GUI library — only the visualization scripts use it)
- `matplotlib` (the visualization scripts use it; API doesn't)
- `ipython`, `ipdb` (REPL/debug)
- `cvxpy`, `ecos` (portfolio optimizer — used by other scripts in the engine, but not by `/api/mc/simulate`)

**Effect of trimming**: first `uv sync` drops from ~3 minutes to ~30 seconds; venv shrinks by ~500 MB.

**Risk**: if some path in the engine quietly imports one of them, the API breaks. Mitigated by `pytest`.

**Recommendation: do this only if `uv sync` time becomes a real friction.** It's
a follow-up. The plan was to defer until after Part C is real, which is now.

## Current canonical phased plan (where we are vs. what's next)

Per `docs/phased-plan.md`:
- ✅ Phase 0 — Domain reshape
- ✅ Phase 1 — Income capability + page
- ✅ Phase 2 — Portfolio page refresh
- ✅ Phase 3 — Retirement page (with later: real-returns fix, diagnostic page)
- ✅ Phase 3.5 (this session's pre-Phase-4 cleanup)
- 🔄 Phase 4 — **Parts A+B+C done; Part D pending Decision 2 above**
- ⏳ Phase 5 — Chat as data-collector + proactive gap-filler + chat→portfolio decoupling. **Untouched.**

After Decision 1 (MC data) + Decision 2 (Part D) close, Phase 4 is complete and
the next major work is Phase 5.

## Files that document this state

- `docs/phased-plan.md` — canonical phased plan (still the right roadmap)
- `docs/phase-4-mc-integration-plan.md` — the Phase 4 A+B execution plan
- `docs/retirement-projection-numbers-analysis.md` — last morning's analysis
- `docs/phase-3.5-refactor-plan.md` — pre-Phase-4 reference profiles + diagnostic
- **this file** — current status + open decisions

## My one-paragraph morning recommendation

> Do **Decision 1 path A** (regenerate cov matrix) first thing — it unlocks the
> success path of the MC page for all 3 demo users and any future user with
> common ETF holdings. Then play with the sandbox for an hour to see what MC
> actually produces. After that, decide **Decision 2** (when/how Part D ships)
> with that grounding. Decisions 3 and 4 are housekeeping — do them whenever.
