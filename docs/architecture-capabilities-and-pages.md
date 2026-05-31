# Architecture — Capabilities vs. Disposable Pages

*Status: proposed / design in progress. First worked instance: `docs/monte-carlo-integration-plan.md`.*

## The problem we're solving
- Add new pages **quickly** with different (sometimes only slightly different) functionality to show end users.
- **Discard & reinvent** pages freely without breaking what already works.
- We are **not** against shared components/hooks/lib — those are good. The enemy is **pages
  (and server orchestrators like chat) depending on each other's *internals***, so changing
  or deleting one ripples into others.

## The model: Capabilities vs. Experiences
- **Capability** = stable, shared functionality with a **published contract**. Owns its
  data/logic. Examples here: portfolio, analysis, market-data, chat, monte-carlo, auth.
- **Experience** = a **disposable page** that *composes* capabilities + shared UI. Deleting
  it touches nothing shared.
- **The one rule that buys disposability:** anything outside a capability (a page, or another
  capability like chat) may use it **only through its contract** — never reach into its
  internal files. Then pages are throwaway and capability internals are free to rewrite.

## The contract: "hybrid" (decided)
Each capability exposes two faces of the **same** logic:
- **HTTP endpoint** (`app/api/<cap>/…`) — what pages/browser call.
- **Typed public API** (`lib/<cap>/index.ts`) — what server-side code imports (other
  capabilities, and the endpoint handlers themselves).
- The endpoint is a thin wrapper over the public API. **Pages → endpoint; server→server →
  public API.** Never import a capability's *internal* module from outside it.

## Layering
```
app/                                  routing only — the "url.py" layer (thin)
  <page>/page.tsx  + _components/      ← EXPERIENCE (disposable; colocated, page-private)
  api/<cap>/route.ts                  ← capability's HTTP face (thin wrapper)
lib/<cap>/   (index.ts = public API)  ← CAPABILITY logic (stable, owns a domain)
shared core: lib/http · lib/db · lib/auth · lib/fastapi · components/ui · shared hooks
```
Shared code stays shared (that's the "core"). The discipline is only: **cross-capability and
cross-page access goes through contracts, not internals.**

## Capability map for this app (from the chat ↔ portfolio analysis)
| Capability | Public API (`lib/`) | HTTP endpoint | Backend |
|---|---|---|---|
| **portfolio** (holdings CRUD/read) | `portfolio-service`, `portfolio-crud` | `/api/portfolio` | Prisma DB |
| **analysis** (risk/sharpe/optimize) | `unified-analysis-service`, `fastapi` | (today via chat + `/api/fastapi`) → add `/api/analysis` | FastAPI :8000 |
| **market-data** (prices, metrics) | `asset-metrics-service`, `historical-price-service` | `/api/asset-metrics`, `/api/portfolio/prices` | DB + yfinance |
| **chat** (LLM + triage) | `chat-triage-processor`, `llm-service` | `/api/chat` | OpenAI/Anthropic |
| **monte-carlo** (NEW) | `lib/mc` | `/api/mc/simulate` | MC service :8001 |
| **auth/session** | `auth` | `/api/auth/*` | DB |

## The one real decoupling this implies
Today **chat bypasses the contract**: `chat-triage-processor.ts` imports `PortfolioCrudHandler`
and `app/api/chat/route.ts` imports `PortfolioService` **directly** (internals). That's the
coupling that makes "discard/reinvent the portfolio page" risky.

Fix: give the **portfolio capability** a public API (`lib/portfolio/index.ts`:
`listHoldings`, `addHolding`, `analyzeHoldings`, …) and make chat call *that*. Then:
- experimental portfolio pages are just alternate UIs over `/api/portfolio`, and
- rewriting portfolio internals can't break chat.

Most other capabilities already sit behind services/endpoints; this is the highest-value
cleanup.

## Recipe — add a new page (cheap)
1. Create `app/<new-page>/page.tsx` (+ `_components/` for page-only UI).
2. Compose existing capabilities via their **endpoints** (or a `lib/<cap>` client) + shared UI.
3. If it needs new server logic, add it to the relevant **capability** (its public API +
   endpoint) — never inline in the page.
→ The page depends only on **contracts + shared core**.

## Recipe — discard a page (safe)
Delete `app/<page>/` (+ `_components/`) and any page-only endpoint. Capabilities and other
pages are untouched, because nothing depended on the page's internals.

## Rollout — incremental, no big-bang  *(DECIDED: MC-pilot-first)*
1. **Pilot: Monte Carlo** — a brand-new capability (`lib/mc` + `/api/mc` + MC service) and a
   disposable page (`/dashboard/monte-carlo`). Proves the pattern end-to-end on a clean slate
   that touches nothing currently working. *(See `docs/monte-carlo-integration-plan.md`.)* **← do this first**
2. **Generalize** — extract the proven conventions from MC into a short "how to add a page"
   recipe (and optionally an ESLint boundary rule).
3. **Portfolio capability boundary** — publish `lib/portfolio/index.ts`; repoint chat to it
   (the key decoupling above). **Done last**, only when clearly worth it.
4. New pages adopt the convention; migrate existing pages opportunistically (never all at once).

## Open questions (for review)
- **Folder naming:** keep capabilities as `lib/<cap>` (least churn, since shared code is fine)
  vs. a top-level `features/<cap>`? *(Leaning `lib/<cap>`.)*
- **Enforcement:** rely on convention, or add an ESLint boundary rule
  (`no-restricted-imports`) so a page/capability *can't* import another capability's internals?
- **Analysis endpoint:** formalize `/api/analysis/*` (today analysis is reached only via chat
  and the raw `/api/fastapi` proxy)?
- ~~**How far to go now** vs. let the pattern emerge?~~ **DECIDED: MC pilot first**, then
  generalize, then migrate existing code (chat↔portfolio decoupling last).
