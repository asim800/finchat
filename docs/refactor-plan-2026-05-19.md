# Finance-App Refactor Plan — Clarity, Modularity, DRY, Separation of Concerns

## Context

This Next.js + Python finance app has accreted significant cruft since active development.
Exploration surfaced four problems worth fixing now:

1. **Dead code at scale.** An entire LangGraph subsystem (`frontend/src/lib/langgraph/`,
   2,874 lines across 11 files), its `use-langgraph-chat.ts` hook, and the
   `/api/chat/langgraph` route are referenced only by one test and one script — the live
   chat flow runs `use-chat-api.ts → /api/chat`. The MCP analysis backend is equally dead:
   `backend-config.ts` hardcodes `BackendType = 'fastapi'`, `unified-analysis-service.ts`
   imports only the FastAPI client, `mcp-client.ts` has zero importers, and
   `services/mcp-server/` is documented as deprecated.
2. **God files that mix concerns.** `portfolio-table.tsx` (1,228), `chat-interface.tsx`
   (870, incl. ~270 lines of commented-out dead code), `portfolio-crud-handler.ts` (854),
   and `fastapi-client.ts` (601, HTTP client + markdown formatters in one file).
3. **DRY violations in `lib/`.** The `Portfolio` type is defined 3×; ~4 hand-rolled
   `fetch` wrappers each re-implement timeout/error/headers; quantity validation is
   duplicated across 3 files.
4. **Orphaned + trivial tests, doc/comment noise.** `src/tests/` imports `@jest/globals`
   but Jest isn't installed, so nothing runs; several tests are trivial.
   `finapp_CLAUDE.md` is byte-identical to `CLAUDE.md`; 171 files carry identical banner
   comment blocks; 2 commented-out code lines linger.

**Outcome:** a smaller, clearer frontend codebase with a single source of truth for shared
types/HTTP, focused single-responsibility modules, a working test runner, and no dead code.
**Out of scope** (per direction): Python FastAPI internals stay as-is except deleting the
deprecated MCP server; LangGraph + MCP are removed, not preserved.

Approach throughout: **behavior-preserving, incremental, compile-checkable steps.** Splits
keep public import paths intact via re-export shims to avoid importer churn.

---

## Part 1 — Safe cleanups (low risk, do first)

### 1.1 Delete dead code (verified: zero live references)
- `rm -rf frontend/src/lib/langgraph/` (2,874 lines)
- `rm frontend/src/hooks/use-langgraph-chat.ts`
- `rm -rf frontend/src/app/api/chat/langgraph/`
- `rm frontend/src/lib/mcp-client.ts`
- `rm -rf services/mcp-server/`
- Remove LangGraph test/script artifacts: `frontend/src/tests/langgraph.test.ts`,
  `frontend/src/scripts/test-langgraph-integration.ts`, and the `test-langgraph`
  script line in `frontend/package.json`.
- Remove now-unused LangChain deps from `frontend/package.json`
  (`@langchain/langgraph`, `@langchain/core`, `@langchain/openai`, `@langchain/anthropic`)
  — **verify no other importers first** with a repo grep before pulling each.
- Simplify `lib/backend-config.ts`: it already only supports `'fastapi'`; drop the dead
  `mcp` conditional branches (lines ~45–51) so the file reflects reality.

### 1.2 Docs & comments
- Delete `finapp_CLAUDE.md` (identical duplicate of `CLAUDE.md`).
- Update `CLAUDE.md`: it describes MCP as the "primary backend" and a dual-backend system
  that no longer exists — correct it to FastAPI-only.
- Remove the 2 commented-out code lines: `portfolio-crud-handler.ts:123`,
  `chat-logger.ts:549`.
- Strip the redundant 4-line `// ===…` / `// FILE: …` banner headers. Do this as a
  scripted pass limited to the top-of-file banner blocks; do **not** touch the
  example-bearing regex comments in `query-triage.ts` (those aid readability).

---

## Part 2 — Frontend `lib/` DRY (do before god-file splits; they depend on these)

### 2.1 Single source of truth for shared types
No `src/types`/`src/lib/types` exists yet. Create `frontend/src/lib/types/`.
- `lib/types/portfolio.ts` — move `Portfolio`, `Asset` (from `portfolio-service.ts:11`),
  `ParsedAsset`/`PortfolioParseResult` (from `portfolio-parser.ts`),
  `DisplayAsset`/`NewAsset` (from `usePortfolioState.ts`), and `PortfolioPosition` (from
  `portfolio-crud-handler.ts`). Add the loose prompt shape as a **distinct** named
  `PromptPortfolio` — do not silently merge it (it is genuinely a different shape).
- `lib/types/index.ts` — barrel.
- Convert the original definition sites to re-export shims
  (`export type { Portfolio, Asset } from './types/portfolio';` etc.) so all existing
  importers keep working unchanged. `financial-prompts.ts` aliases
  `PromptPortfolio as Portfolio`. Also dedup the third `interface Portfolio` in
  `components/portfolio/multi-portfolio-manager.tsx:17`.
- Risk: **mechanical** (type-only moves + shims).

### 2.2 Shared HTTP client
Replace 4 hand-rolled fetchers (`fastapi-client.ts` `makeRequest`,
`conversation-analytics.ts:514`, `chat-simulation.ts:87`, plus the repeated patterns in
`hooks/use-chat-api.ts`, `hooks/usePortfolioCRUD.ts`, and inline in `portfolio-table.tsx`).
- Create `lib/http/http-client.ts` exporting `httpRequest<T>(url, opts)` + thin
  `httpGet/httpPost/httpPut/httpDelete` and an `HttpError` class. Centralizes JSON headers,
  `AbortController` timeout (default 30s), and error precedence
  `errorData.detail ?? errorData.error ?? \`HTTP ${status}: ${statusText}\``
  (superset covering both FastAPI `.detail` and Next API `.error` conventions),
  AbortError → "Request timed out".
- `lib/http/index.ts` — barrel.
- Adoption order (each compiles): add files (unused) → `fastapi-client` (keep its
  `conversationAnalytics.trackFastAPICall` timing wrapper) → `usePortfolioCRUD` →
  `use-chat-api` → `chat-simulation` + `conversation-analytics`.
- Risk: **mechanical** except the `fastapi-client` swap — treat as its own diff and confirm
  user-facing error strings are byte-identical (they reach the chat UI via the chat route).

### 2.3 Quantity-validation consolidation
`validation.ts` `QuantityValidationUtils` is the de-facto canonical impl. Make others call it:
- `portfolio-crud-handler.ts`: replace inline `quantity <= 0` guards with
  `QuantityValidationUtils.parseQuantity(...)` and `validateSymbol` regex with
  `ValidationPatterns.stockSymbol`.
- `portfolio-table.tsx`: same, during 3.1.
- Risk: **logic (low)** — `parseQuantity` also rejects >2-dp/non-finite (a deliberate
  tightening vs the old `<=0`-only check). Flag in the PR/review notes.

---

## Part 3 — God-file splits (re-export shims keep import paths stable)

### 3.1 `components/portfolio/portfolio-table.tsx` (1,228) → `portfolio-table/`
- `portfolio-table/index.tsx` — slim container, keeps `export const PortfolioTable`.
- `portfolio-table-skeleton.tsx` — loading skeleton.
- `asset-metrics-panel.tsx` — the metrics panel currently **duplicated** in the mobile
  (938–1008) and desktop (1136–1216) blocks; unify with a `variant: 'mobile'|'desktop'`
  prop (visual check needed — grids/subtitles differ slightly).
- `portfolio-table-row.tsx` (desktop row + editable cells) and
  `portfolio-asset-card.tsx` (mobile card + edit form), both rendering `AsphaltMetricsPanel`.
- `use-portfolio-table-actions.ts` — `loadPortfolio`/`handleAddAssetInternal`/`saveEdit`/
  `deleteAsset`, using the 2.2 HTTP client and 2.3 validation.
- Folder `index.tsx` resolves the existing extensionless specifier → **no importer changes.**
- Risk: presentational extractions **mechanical**; the actions hook is **logic (medium)** —
  preserve guest-vs-auth + `onAssetsChange`-vs-`loadPortfolio` branching and the
  early-return-on-error in `saveEdit` verbatim.

### 3.2 `components/chat/chat-interface.tsx` (870) → `chat-interface/`
- **First:** delete dead commented-out block (lines ~599–870).
- `chat-interface/index.tsx` — slim container, keeps `export const ChatInterface`; owns the
  `useScrollManager` refs.
- `welcome-message.ts` — single `getWelcomeMessage(isGuestMode)` (kills duplicated strings
  at 164–172 vs 183–191).
- `chat-message-list.tsx`, `chat-input-bar.tsx`, `chat-quick-actions.tsx` — presentational.
- `use-chat-conversation.ts` — `messages`/session/pagination state, `handleSend`,
  `handleLoadMore`, `initializeSession`, `handleFileDataExtracted`.
- Risk: **logic (medium)** at the hook — preserve `handleSend` ordering (analytics →
  chart-update → session-id) and the `setTimeout(…, 500)` init timing; move verbatim.

### 3.3 `lib/portfolio-crud-handler.ts` (854) → `portfolio-crud/`
- `portfolio-crud/portfolio-resolver.ts` — `findPortfolioByName`/`findPortfolioWithFallback`.
- `add-handler.ts`, `remove-handler.ts`, `update-handler.ts`, `show-handler.ts` —
  the four `private static` methods become module-level functions.
- `portfolio-crud/index.ts` — keeps `class PortfolioCrudHandler` with `processRegexpMatch`,
  `validateSymbol`, `getPortfolioSummary`, delegating to the extracted functions.
- Convert `portfolio-crud-handler.ts` to a re-export shim
  (`export { PortfolioCrudHandler } from './portfolio-crud';`) → **no importer changes.**
- Risk: **mechanical** + **logic (low)** for the 2.3 validation swap. The returned message
  strings are user-facing — diff carefully.

### 3.4 `lib/fastapi-client.ts` (601) → `lib/fastapi/`
- `fastapi/types.ts` — the 8 response interfaces.
- `fastapi/analysis-formatters.ts` — the 5 `formatX` pure functions.
- `fastapi/fastapi-client.ts` — `FastAPIClient` class + `fastAPIClient` instance (uses 2.2).
- `fastapi/index.ts` — barrel.
- Convert `fastapi-client.ts` to a re-export shim (`export * from './fastapi/types';` etc.)
  → `unified-analysis-service`'s aliased formatter imports and all `fastAPIClient` consumers
  stay unchanged.
- Risk: **mechanical** (only the optional 2.2 HTTP swap is logic).

---

## Part 4 — Tests: wire Jest, prune trivial

- Add `jest`, `ts-jest` (or `@swc/jest`), `@types/jest`, `jest-environment-jsdom` to
  `frontend` devDependencies; add `jest.config.js` (ts preset, `@/` moduleNameMapper to
  `<rootDir>/src/`, jsdom env); add `"test": "jest"` to `package.json` scripts.
- Make the surviving real suites run: `chat-triage.test.ts`, `form-fields.test.ts`,
  `chat-history.test.ts`, `navigation.test.ts` (`langgraph.test.ts` already removed in 1.1).
- **Delete trivial tests:** `navigation.test.ts` button-variant getter (178–187),
  static settings-nav assertions (190–201), re-invented mobile-toggle (234–277);
  `chat-history.test.ts` duplicate/empty-message framework-behavior tests (91–108);
  `form-fields.test.ts` perf benchmarks (397–434).
- Fix any imports in surviving tests that broke from Part 2/3 moves; confirm `npm test` is
  green before finishing.
- Leave the `src/scripts/test-*.ts` ad-hoc manual scripts as-is (they're utilities, not a
  suite) but they're documented as manual.

---

## Recommended execution order (each step compiles independently)

1. Part 1 cleanups (dead code, docs, comments).
2. 2.1 types SSOT → 2.2 http client files (unused) → 3.4 fastapi split + shim.
3. 2.2 adoption (fastapi-client first as isolated diff, then hooks/sim/analytics).
4. 3.3 portfolio-crud split + shim, then 2.3 validation inside it.
5. 3.1 portfolio-table split (+ 2.3 in actions).
6. 3.2 chat-interface (delete dead code first, then split).
7. Part 4 Jest + prune.

## Verification

- After **each** step: `cd frontend && npx tsc --noEmit` and `npm run build` (or `next build`)
  must pass; `npm run lint` clean.
- After Part 4: `npm test` green.
- Manual smoke (the app has no E2E): `npm run dev`, then exercise the live paths the splits
  touched — load a portfolio (add/edit/delete an asset), send a chat message that triggers a
  portfolio CRUD command and one that triggers a FastAPI risk/Sharpe analysis (confirm the
  formatted markdown + any chart still render), and confirm guest mode still works.
- `git diff --stat` to confirm net line reduction and that no `langgraph`/`mcp` references
  remain: `grep -rn "langgraph\|mcp-client\|mcp-server" frontend/src` should be empty.
