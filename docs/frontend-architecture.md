# Frontend Architecture — High-Level Overview

*Part 1 of 2 — the shape of the `frontend/` Next.js app (current, post-2026-05 refactor).
Low-level reference: `frontend-architecture-details.md`.
Plan docs this supports: `architecture-capabilities-and-pages.md`, `monte-carlo-integration-plan.md`.*

## At a glance
- Next.js **15** App Router · TypeScript · Tailwind **v3** + shadcn/ui · Prisma/PostgreSQL · Recharts
- **16** pages · **29** API routes · **74** components · **8** hooks · **45** `lib/` modules
- Backends it talks to: its own **Prisma DB**, **LLM** providers (OpenAI/Anthropic), and a
  **Python FastAPI** analysis service.

## Three ideas to internalize first
1. **Server vs. client split.** API routes + server pages run on the server (hold secrets,
   touch the DB/LLM/Python). Client components (`'use client'`) are pure UI and only ever call
   `/api/*`. Data access never happens in the browser.
2. **The filesystem is the route table** (like Django `urls.py`, by directory):
   `app/dashboard/chat/page.tsx` → `/dashboard/chat`; `app/api/chat/route.ts` → `/api/chat`.
3. **`lib/` is the brain.** Business logic lives in `lib/` services; API routes are thin
   orchestrators; hooks are the client-side bridge. Components stay mostly presentational.

## The layered mental model
```
Browser
 └─ Page (server)            routing + auth gate
     └─ Client component       UI + interaction
         └─ Hook               stateful logic; calls /api
             └─ API route       server orchestration (thin)
                 └─ lib/ service   business logic (the brain)
                     └─ External: Prisma DB · LLM · FastAPI (Python)
```
A feature today is **spread across layers** (`components/` + `hooks/` + `lib/` + `app/api/`),
because the code is organized **"layer-first"** (grouped by technical type, shared across all
features). Hold that thought for the plan comparison below.

## The domains (what the app actually does)
- **Auth** — JWT-in-cookie; every API route validates per request; no user ⇒ **guest mode**
  (a localStorage portfolio instead of the DB). Guests can use chat + reference portfolios.
- **Portfolio** — create portfolios, manage holdings (CRUD), see valuation + metrics.
- **Analysis** — risk / Sharpe / optimization / Monte Carlo / sentiment, computed by the
  **Python FastAPI** service (the frontend just sends holdings and renders results).
- **Chat** — the **hub**: a smart router over the other domains (see below).
- Plus **market/reference data**, **learning** (financial terms), and **admin**.

## Chat is the integration hub (the one flow to understand)
The chat box isn't "just an LLM." It's a **triage router**: each message is classified and sent
to one of three places —
1. **Deterministic portfolio command** ("add 100 AAPL") → mutate holdings in the DB,
2. **Analysis request** ("what's my risk?") → call the Python FastAPI service,
3. **Everything else** → the LLM, with portfolio context injected.
This is why chat is coupled to portfolio + analysis — it consumes both. (Details + the exact
coupling points are in Part 2.)

## Conventions & philosophy
- **No global state store** (no Redux/Zustand) — local React state + `useReducer` + custom
  hooks; guest data in `localStorage`.
- **Design system**: shadcn/ui primitives + Tailwind; a `.dark`-class theme toggle.
- **Resilience**: a shared HTTP client, a central error system, and conversation
  analytics/logging are cross-cutting concerns in `lib/`.

## Reading this against the proposed plan (your goal)
The capabilities/pages plan wants **capabilities** (stable, contract-backed domains) +
**disposable pages**. Against today:

- **Already ~80% there:** logic is already in `lib/` services, and per-domain API endpoints
  already exist. "Capabilities" largely exist — just unlabeled and unenforced.
- **The gaps the plan targets:**
  1. Organization is **layer-first**, not capability/feature-first (a page is smeared across folders).
  2. **No contract discipline** — chat reaches into portfolio's *internals* rather than a
     published API/endpoint (the one real decoupling to do).
  3. Pages aren't **disposable** yet (no page-local colocation convention).
- **Why Monte Carlo goes first:** it's greenfield — a new capability + endpoint + page that
  proves the whole pattern **without touching** any of the coupling above.

**Bottom line:** the plan is mostly *naming/boundary discipline* + one decoupling, not a
rewrite. → Continue to **Part 2** (`frontend-architecture-details.md`) for the file-level map,
the exact chat lifecycle, the `lib/` catalog, and the precise coupling points.
