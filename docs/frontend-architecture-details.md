# Frontend Architecture — Low-Level Details

*Part 2 of 2 — file/function-level reference. Read `frontend-architecture.md` (Part 1) first
for the big picture.*

## Directory map
```
frontend/
  next.config.ts          ignoreBuildErrors + eslint.ignoreDuringBuilds = true
  tailwind.config.js       darkMode: ['class']
  postcss.config.js        tailwindcss + autoprefixer (v3)
  jest.config.js           @swc/jest, jsdom, @/ → src/
  prisma/schema.prisma     data models (below)
  src/
    middleware.ts          edge auth/guest gate
    app/
      layout.tsx           Geist fonts, <ThemeProvider>, <ConstructionBanner>
      page.tsx             landing
      (auth)/login, register
      dashboard/           chat/ myportfolio/ portfolio/ profile/ admin/{chat-analytics} layout.tsx
      learning/            financial-terms/ supported-assets/
      contact/  logout/
      api/                 see "API routes" below
    components/  ui/ chat/ portfolio/ admin/ auth/ profile/ layouts/ theme-provider.tsx
    hooks/       use-chat-api, useChatHistory, use-form-validation, use-standard-form,
                 usePortfolioState, usePortfolioCRUD, usePortfolioMetrics, useScrollManager
    lib/         45 modules (catalog below)
```

## Data models (`prisma/schema.prisma`)
`User`, `Portfolio`, `Asset`, `Account`, `ChatSession`, `Message`, `ApiKey`,
`HistoricalPrice`, `AssetMetrics`, `FinancialTerm`. Accessed only via the Prisma singleton in
`lib/db.ts` (`export const prisma = … ?? new PrismaClient()` with dev global caching).

## Routing & middleware (`src/middleware.ts`)
Matcher excludes `api`, `_next/*`, `favicon`. Reads `auth-token` cookie (presence only —
**no verification here**; real validation is in API routes). Rules:
- `protectedRoutes = ['/dashboard/myportfolio', '/api-keys', '/accounts']` → `/login` if no token.
- `authRoutes = ['/login','/register']` → `/dashboard/chat` if token present.
- `guestAllowedRoutes = ['/dashboard/chat','/dashboard/portfolio','/demo']` → sets response
  header `x-guest-mode: 'true'|'false'`.

## API routes (29) — grouped
- **auth**: `/api/auth/{login,register,logout,me}`, `/api/debug/auth`
- **chat**: `/api/chat`, `/api/chat/providers`, `/api/chat/sessions`,
  `/api/chat/sessions/[sessionId]`, `/api/chat/sessions/[sessionId]/messages`
- **portfolio**: `/api/portfolio`, `/api/portfolio/export`, `/api/portfolio/prices`
- **analysis proxy**: `/api/fastapi`, `/api/fastapi/[...slug]`
- **asset/reference**: `/api/asset-metrics`, `/api/asset-metrics/{bulk,search,sectors,[symbol]}`,
  `/api/supported-assets`, `/api/financial-terms`
- **profile/contact**: `/api/profile`, `/api/contact`
- **admin**: `/api/admin/{users,db,chat-analytics,financial-terms,financial-terms/[id]}`

## Auth mechanics (`lib/auth.ts`)
- `hashPassword`/`verifyPassword` (bcryptjs), `generateToken` (jsonwebtoken, `expiresIn: '7d'`),
  `verifyToken`.
- `getUserFromRequest(req)` → reads `auth-token` cookie **or** `Authorization: Bearer` →
  `verifyToken` → `AuthUser | null`. `null` ⇒ guest path.

## Chat request lifecycle (exact)
`hooks/use-chat-api.ts` → `POST app/api/chat/route.ts`:
1. `getUserFromRequest()` → `user` / `isGuestMode`.
2. `ChatService` (`lib/chat-service.ts`) → load or create session + prior messages (Prisma).
3. Load `PortfolioService.getUserPortfolios()`; enrich each with
   `fastAPIClient.calculatePortfolioRisk()` (`marketTotalValue`).
4. `ChatTriageProcessor.processQuery(message, ctx)` (`lib/chat-triage-processor.ts`):
   - `QueryTriage.analyzeQuery()` (`lib/query-triage.ts`) → `regexp | llm | hybrid`.
   - **regexp** → `PortfolioCrudHandler.processRegexpMatch()` (`lib/portfolio-crud/`) → DB/guest.
   - **llm** with analysis keywords (`requiresFinancialAnalysis()`) →
     `unifiedAnalysisService.analyzeQuery()` → `fastAPIClient` (`lib/fastapi/`) → Python `:8000`.
   - **llm** otherwise → `llmService.generateResponse()` with `generateFinancialPrompt()` context.
   - **hybrid** → LLM fills missing fields, then CRUD.
5. Chart/figure generation for llm/hybrid responses.
6. `ChatService.saveMessage()` (user + assistant) → DB.
7. Returns `{ content, provider, processingType, confidence, executionTimeMs, chartData }`.

## Portfolio CRUD flow (exact)
`usePortfolioState` (useReducer store) + `usePortfolioCRUD` → `lib/http` →
`/api/portfolio` (GET/POST/PUT/DELETE) → `PortfolioService` (Prisma) for authed users, or
`GuestPortfolioService` (`lib/guest-portfolio.ts`, localStorage) for guests. UI:
`multi-portfolio-manager.tsx` → `portfolio-table.tsx` (+ `portfolio-table/` parts) +
`portfolio-dashboard.tsx` (analytics tiles via `usePortfolioMetrics`).

## `lib/` catalog (45 modules) by concern
- **core/infra**: `db.ts`, `auth.ts`, `admin-auth.ts`, `http/` (`http-client.ts`, `index.ts`),
  `types/` (`portfolio.ts`, `index.ts`), `logger.ts`, `utils.ts`, `number-utils.ts`, `error-system.ts`
- **portfolio**: `portfolio-service.ts`, `portfolio-crud/` (`portfolio-resolver`, `add/remove/
  update/show-handler`, `types`, `index`), `portfolio-parser.ts`, `guest-portfolio.ts`, `tax-utils.ts`
- **analysis backend**: `fastapi/` (`fastapi-client`, `types`, `analysis-formatters`, `index`),
  `fastapi-client.ts` (shim), `unified-analysis-service.ts`, `backend-config.ts`
- **chat/LLM**: `chat-triage-processor.ts`, `query-triage.ts`, `chat-service.ts`,
  `chat-simulation.ts`, `llm-service.ts`, `llm-config.ts`, `financial-prompts.ts`,
  `chat-logger.ts`, `conversation-analytics.ts`
- **market/reference**: `asset-metrics-service.ts`, `historical-price-service.ts`
- **misc**: `validation.ts`, `csv-export.ts`, `email-service.ts`, `analytics-test.ts`

## The exact coupling points (what the plan decouples)
- `app/api/chat/route.ts` imports **`PortfolioService`** + **`fastAPIClient`** directly.
- `lib/chat-triage-processor.ts` imports **`PortfolioCrudHandler`** + **`unifiedAnalysisService`**
  directly.
→ Chat depends on portfolio/analysis **internals**, not a published contract. The plan's
"hybrid contract" + portfolio `index.ts` + repointing chat addresses exactly this.

## State management
- `usePortfolioState.ts` — `useReducer` store (assets, editing, add-form state).
- `usePortfolioCRUD.ts` / `usePortfolioMetrics.ts` — API calls + metrics.
- `use-chat-api.ts` — chat send/session load (the `/api/chat` bridge).
- `useChatHistory.ts` — chat history (localStorage); `useScrollManager.ts` — scroll.
- `use-form-validation.ts` / `use-standard-form.ts` — form state/validation.
- No global store; guest portfolio + chat history in `localStorage`.

## Styling & theming
- Tailwind **v3**, `darkMode: ['class']`; shadcn/ui primitives in `components/ui/` are
  token-driven (`bg-card`, `text-foreground`, `border-border`) and dark-aware.
- `components/theme-provider.tsx` (next-themes) toggles `.dark`; root `layout.tsx` sets
  `attribute="class"`, `defaultTheme="system"`, Geist Sans/Mono fonts, and `<ConstructionBanner>`.
- Non-primitive components historically hardcoded light classes; the 2026-05 pass added
  `dark:` variants across the app (see `session-big-refact-in-may.md`).

## Charts & figures
- Recharts in `components/chat/chart-display.tsx` (pie/bar; mobile 200px / desktop 300px).
- The Python service also returns **SVG `figure_data`** rendered inline in chat (e.g. the risk
  dashboard); the MC service returns Recharts-ready fan-chart data.

## Build / deploy specifics
- App root is `frontend/` → Vercel **Root Directory must = `frontend`** (otherwise
  "No Next.js version detected"). `.vercel` link belongs in `frontend/`, not repo root.
- `next.config.ts`: `typescript.ignoreBuildErrors` + `eslint.ignoreDuringBuilds` (so the
  ~150 pre-existing TS errors and lint don't block builds — track the count, don't add to it).
- Env (`.env.local` dev / `.env`): `JWT_SECRET`, `DATABASE_URL`, `OPENAI_API_KEY`,
  `ANTHROPIC_API_KEY`, `FASTAPI_SERVICE_URL`, `PRIMARY_ANALYSIS_BACKEND`,
  `ENABLE_BACKEND_FALLBACK`. (MC pilot will add `MC_SERVICE_URL`.)
- Tests: `npm test` (Jest + @swc/jest, jsdom). Dev: `npm run dev`; build: `next build`.

## Gotchas worth knowing
- `lib/db.ts` has leftover appended auth-type content (a stray `FILE: types/auth.ts` banner) —
  harmless but a cleanup candidate.
- Two Monte Carlo paths will coexist: the simple `/portfolio/monte-carlo` in the existing
  FastAPI service (already wired into chat) and the richer standalone MC service (the pilot).
- `fastapi-client.ts` and `portfolio-crud-handler.ts` at `lib/` root are **re-export shims**
  over `lib/fastapi/` and `lib/portfolio-crud/` (kept so existing imports don't churn).
