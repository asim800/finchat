# Plan: Phase 3.5 — Reference Profiles, Pull-a-Profile, Directory, Retirement Diagnostic

*(Canonical phased plan is `docs/phased-plan.md`. The Phase 3 retirement-hub plan that
previously occupied this file shipped in commits `ee0a5859`, `a7b76532`, `bdf22b7a`,
`c9919778` and is no longer needed here.)*

## Context

Before Phase 4 (Monte Carlo), user wants four pre-refactor changes that improve
onboarding + transparency:

1. **Reference profiles** — Make 3 demo users (John / Jane / Jack & Jill) browsable
   by **logged-in users** on the Templates page as starting points. We plan to add
   more reference profiles based on feedback, so this needs to scale beyond 3.
2. **Pull-a-profile** — A logged-in user can copy any reference profile into their
   own account as a starting point: **granular** (section-by-section: portfolios /
   income / profile fields) and **additive** (no destruction of existing data).
3. **Directory** — A new `/sitemap` (or `/directory`) page that lists every public
   surface in the app — including upcoming pages like the Phase-4 Monte Carlo
   sandbox marked "coming soon."
4. **Retirement diagnostic** — A separate diagnostic page surfacing the per-account
   breakdown that drives the projection's investable balance, plus three controls
   the user wants for "what if" auditing: **toggle SS on/off**, **override
   monthly income**, **override monthly expenses**. Helps validate "is the model
   doing what I think it's doing."

These are interconnected (reference profiles power pull-a-profile and templates;
directory links to all of them; diagnostic exposes retirement internals). Building
them together avoids re-touching the same files twice.

User's confirmed choices this session:
- Public scope: **logged-in users only** (reference profile data is behind login;
  changed from the user's initial "truly public" answer after reconsideration).
- Pull semantics: **granular, additive** (pick sections, don't destroy existing).
- Validation: **separate diagnostic page** with override controls.
- Directory shape: **new /sitemap or /directory page in the nav**.

## Decisions made up-front (so they don't get re-litigated mid-build)

| Decision | Choice | Why |
|---|---|---|
| How to flag a user as a "reference profile" | `User.isReferenceProfile: Boolean @default(false)` + optional `referenceTitle`, `referenceDescription` | Scales beyond 3; one field controls public visibility; easy to set via seed for now, can expose admin UI later. **Hardcoding 3 emails was rejected** because it doesn't scale. |
| Where the reference viewer lives | New `/dashboard/reference/[userId]/portfolio` and `/dashboard/reference/[userId]/income` routes — **under `/dashboard`** because they're auth-required | `/dashboard/*` is the "logged-in surface"; the `reference/` segment makes it clear this is "someone else's reference data, read-only" rather than your own. Middleware: `/dashboard/reference` added to `protectedRoutes` (NOT to `guestAllowedRoutes`). |
| What the reference viewer renders | Lightweight read-only summary tables, NOT a re-skinned MultiPortfolioManager | Adding `readOnly` plumbing through 600+ lines of existing portfolio UI is invasive. Read-only summaries are 100 lines, throwaway-safe per the disposable-pages philosophy. |
| Profile-fields copy semantics | Only fills the target user's **empty** fields (does NOT overwrite filled ones) | "Additive" means don't destroy existing user data. If their `monthlyIncome` is set, we leave it. |
| Diagnostic page implementation | Extend `RetirementInputs` + `RetirementResult` (don't fork a new API) | Single capability contract; diagnostic page is just a thin UI over richer inputs. |
| Price-source mismatch | **Flag in this plan, defer fix** | Retirement reads raw `asset.price`; portfolio-service applies a historical-lookup fallback. For all seed users this matches (seed sets `asset.price`). The diagnostic page's per-account breakdown will surface the gap if it bites a real user. Fix-in-place when it does. |

## Work packages (4 independent, can ship as one PR)

### Package A — Reference profile schema + viewers (~5 new files, ~3 edits)

**Schema** — `frontend/prisma/schema.prisma`:
- Add to `User`:
  - `isReferenceProfile Boolean @default(false)`
  - `referenceTitle    String?`  (e.g. "Single, mid-career, urban renter")
  - `referenceDescription String?` (1-2 sentence blurb for the card)
- Run `npx prisma db push` (matches the project's existing schema-management
  pattern; no migration files).

**Seed** — `frontend/scripts/seed-demo-users.ts`:
- Set `isReferenceProfile: true`, `referenceTitle`, `referenceDescription` on
  the 3 personas. Per-persona blurbs in seed.

**Templates page rewrite** — `frontend/src/app/dashboard/portfolio/page.tsx`:
- **Delete** the hardcoded `REFERENCE_PORTFOLIOS` array.
- For **logged-in users**: fetch users where `isReferenceProfile=true` via a new
  `lib/reference.listReferenceProfiles()`. Render one summary card per
  reference user: name, title, description, total investable assets, retirement
  readiness blurb (computed via `lib/retirement` with sensible defaults; cached/
  fast), plus three CTAs:
  - "View portfolios" → `/dashboard/reference/[userId]/portfolio`
  - "View income" → `/dashboard/reference/[userId]/income`
  - "Use as starting point" → opens copy modal (Package B)
- For **guests** (unauthenticated visitors): show a small "Sign in to explore
  reference profiles" CTA. No leakage of who the reference users are.

**Read-only viewer routes** (all require auth):
- `frontend/src/app/dashboard/reference/[userId]/portfolio/page.tsx` (thin server wrapper)
- `frontend/src/app/dashboard/reference/[userId]/income/page.tsx` (thin server wrapper)
- `frontend/src/app/dashboard/reference/[userId]/_components/PortfolioReadOnly.tsx`
  (compact table: portfolio → account → assets with values; no buttons)
- `frontend/src/app/dashboard/reference/[userId]/_components/IncomeReadOnly.tsx`
  (compact list of cash flows grouped by Income/Expense; no buttons)
- 404 if user not found OR `isReferenceProfile=false`. Never leaks non-reference
  users via guessable URLs.

**Middleware** — `frontend/src/middleware.ts`:
- Add `/dashboard/reference` to `protectedRoutes` (auth required).
- No change to `guestAllowedRoutes` — Templates page itself stays guest-allowed,
  but it serves a "sign in" CTA to guests.

### Package B — Pull-a-profile capability + UI (~4 new files, ~1 edit)

**Capability** — `frontend/src/lib/reference/index.ts` + `types.ts`:
- `listReferenceProfiles(): Promise<ReferenceProfileSummary[]>` — used by Package A.
- `getReferenceProfile(userId): Promise<ReferenceProfileSummary | null>` — full
  data for the viewer routes.
- `copyReferenceSections(sourceUserId, targetUserId, sections, opts?): Promise<CopyResult>` —
  the core copy logic. `sections: { portfolios?: boolean; income?: boolean;
  profile?: boolean }`. Composes:
  - `lib/accounts` (for creating Account + RealEstateDetails copies)
  - `lib/income` (for creating CashFlow copies)
  - Direct Prisma for Portfolio + Asset (creation; the existing `lib/portfolio-service`
    handles assets but auto-creates a default account we don't want here)
- Copy rules:
  - Portfolios get suffixed: `"<original name> (from <referenceTitle>)"`
  - Accounts inside copied portfolios get their original type + name; the
    auto-default-Other-account behavior in `createPortfolio` is bypassed by
    creating portfolios via direct Prisma here.
  - Assets get their `accountId`, `portfolioId`, `quantity`, `avgCost`, `price`,
    `assetType` copied. Pricing stays user-overridable later.
  - Cash flows copied verbatim (including `inflationAdjusted`, dates, source).
  - Profile fields ONLY fill where target user's field is null/empty.

**HTTP face** — `frontend/src/app/api/reference/copy/route.ts`:
- POST body: `{ sourceUserId: string; sections: { portfolios?: boolean;
  income?: boolean; profile?: boolean } }`
- `getUserFromRequest` for the target user (must be authenticated).
- Validates: source user must have `isReferenceProfile=true`.
- Returns: `CopyResult` with counts of items copied per section.

**UI** — `frontend/src/app/dashboard/portfolio/_components/CopyReferenceModal.tsx`:
- Triggered from the Templates page card's "Use as starting point" button.
- 3 checkboxes (portfolios / income / profile fields, default ALL checked).
- A "What will happen" preview line: "Will add 1 portfolio with 2 accounts + 5
  assets, 5 cash flows, and fill 4 empty profile fields."
- Confirm → POST `/api/reference/copy` → show success summary → navigate to
  `/dashboard/myportfolio`.

### Package C — Directory page (~2 new files, ~2 edits)

**Page** — `frontend/src/app/directory/page.tsx`:
- **Not under `/dashboard/`** — directory is the discovery surface for both
  guests and logged-in users.
- Server component. Reads auth state (header) to decide which links to surface.
- Sections:
  - **For everyone:** Home, Login, Register, Templates, Chat, Contact, Learning
    (Financial Terms, Supported Assets).
  - **Logged-in only:** My Portfolio, Income, Retirement, **Reference profiles**
    (auto-listed from `listReferenceProfiles()`), Profile, Account,
    Retirement Diagnostic (Package D), Admin (if admin).
  - **Coming soon:** Monte Carlo Sandbox (`/dashboard/monte-carlo`) — listed but
    disabled / "Coming in Phase 4" badge.
- One-line description per link. For guests, the "Logged-in only" section is
  rendered with a "Sign in to access" badge instead of being hidden.

**Middleware** — `frontend/src/middleware.ts`:
- Add `/directory` to `guestAllowedRoutes`.

**Nav** — both top bars:
- `authenticated-top-bar.tsx`: add `{ href: '/directory', label: 'Directory', ... }`
  between Templates and Chat.
- `guest-top-bar.tsx`: same — guests benefit from the discovery surface most.

### Package D — Retirement diagnostic + capability extension (~3 new files, ~2 edits)

**Capability extension** — `frontend/src/lib/retirement/types.ts`:
- Extend `RetirementInputs`:
  - `overrideMonthlyIncome?: number | null`
  - `overrideMonthlyExpenses?: number | null`
  - `includeSocialSecurity?: boolean` (defaults to true; when false, the
    retirement-income figure excludes ALL SS sources — both profile and CashFlow)
- Extend `InputsResolved` with:
  - `investableBreakdown: InvestableBreakdownRow[]` —
    `{ accountId, accountName, accountType, portfolioName, value, source: 'assets' | 'balance' }[]`
- Extend `RetirementResult` to carry the breakdown.

**Capability behavior** — `frontend/src/lib/retirement/index.ts`:
- In `gatherInputs`: if `overrideMonthlyIncome` is a number, use it; else fall
  through to the existing cashflow/profile chain. Same for expenses. Record the
  effective source as `'override'` when applicable (extend `InputSource` enum).
- In `monthlyRetirementIncomeAtRetire` computation: if `includeSocialSecurity ===
  false`, **skip** CashFlow SocialSecurity rows AND the
  `User.estimatedSocialSecurityAt65` fallback. Pension/Annuity/RentalIncome
  still counted.
- In `sumInvestableBalance`: emit a per-account breakdown row alongside the total
  (small change — same loop, extra collection).
- This is the **same capability, richer output** — no new endpoint needed.

**Diagnostic page** — `frontend/src/app/dashboard/retirement/diagnostic/page.tsx`:
- Thin server wrapper, metadata, renders `<RetirementDiagnosticClient />`.
- Middleware-protected (same auth as `/dashboard/retirement`).

**Diagnostic client** —
`frontend/src/app/dashboard/retirement/diagnostic/_components/RetirementDiagnosticClient.tsx`:
- Owns ephemeral state for the same three retirement inputs plus the three new
  override controls.
- Layout:
  - At top: small headline "What the model is using" reading directly from
    `inputsResolved` (current age, income source + amount, expense source +
    amount, retirement income at retire, expected return).
  - Three diagnostic controls (toggle SS, override income, override expenses),
    each with a "use what the page resolved" reset link.
  - **Per-account investable breakdown table**: rows = accounts (name, type,
    portfolio, source 'assets' vs 'balance', value), totals row that equals the
    headline `investableBalance` — the user can mentally cross-check vs the
    Portfolio page.
  - Compact projection chart (reuse the existing `ProjectionChart` component).
  - "Money lasts to age X" headline (reuse `ReadinessHeadline`).
- Link from the main `/dashboard/retirement` page to here ("View diagnostic" /
  "Audit numbers") and vice versa.

## Files (totals)

| Package | New | Edited |
|---|---:|---:|
| A. Reference profiles + viewers | 5 | 3 |
| B. Pull-a-profile | 4 | 1 |
| C. Directory | 1 | 2 |
| D. Retirement diagnostic | 2 | 2 |
| **TOTAL** | **12** | **8** (some files in >1 package) |

**Edited (deduplicated):**
- `frontend/prisma/schema.prisma` (A)
- `frontend/scripts/seed-demo-users.ts` (A)
- `frontend/src/app/dashboard/portfolio/page.tsx` (A — full rewrite)
- `frontend/src/middleware.ts` (A + C)
- `frontend/src/components/ui/authenticated-top-bar.tsx` (C)
- `frontend/src/components/ui/guest-top-bar.tsx` (C)
- `frontend/src/lib/retirement/types.ts` (D)
- `frontend/src/lib/retirement/index.ts` (D)

**Created (new):**
- `frontend/src/lib/reference/types.ts` (A+B)
- `frontend/src/lib/reference/index.ts` (A+B)
- `frontend/src/app/dashboard/reference/[userId]/portfolio/page.tsx` (A)
- `frontend/src/app/dashboard/reference/[userId]/income/page.tsx` (A)
- `frontend/src/app/dashboard/reference/[userId]/_components/PortfolioReadOnly.tsx` (A)
- `frontend/src/app/dashboard/reference/[userId]/_components/IncomeReadOnly.tsx` (A)
- `frontend/src/app/api/reference/copy/route.ts` (B)
- `frontend/src/app/dashboard/portfolio/_components/CopyReferenceModal.tsx` (B)
- `frontend/src/app/directory/page.tsx` (C)
- `frontend/src/app/dashboard/retirement/diagnostic/page.tsx` (D)
- `frontend/src/app/dashboard/retirement/diagnostic/_components/RetirementDiagnosticClient.tsx` (D)

## Build order (each step compiles + ships independently)

1. **A.1 Schema + seed** — Prisma push + reseed; lay foundation. Verify in DB:
   `SELECT email, isReferenceProfile, referenceTitle FROM users WHERE isReferenceProfile`.
2. **A.2 `lib/reference`** — `listReferenceProfiles`, `getReferenceProfile`. In-process
   smoke: confirm returns the 3 demo users with summaries.
3. **A.3 Templates page rewrite + reference viewers** — visual.
4. **B Pull-a-profile** — capability + endpoint + modal. Manual test: log in as a
   fresh non-demo user, pull John's profile, confirm 1 portfolio appears with
   "(from John Doe — Single, mid-career)" suffix.
5. **C Directory** — page + nav. Visual.
6. **D Retirement diagnostic** — capability extension + page. Smoke test:
   `projectRetirement(userId, { ..., includeSocialSecurity: false })` → confirm
   retirement income drops by the SS amount.

## Discipline (carried forward from the phased plan philosophy)

- **All composition + math lives in `lib/`.** Pages stay thin (no Prisma, no
  business rules, no asset-math). Page → capability HTTP contract → capability
  composes other capabilities.
- **`lib/reference` composes `lib/accounts` + `lib/income`** for copy operations.
  Direct Prisma is acceptable for Portfolio creation (existing pattern in
  `lib/portfolio-service`); use the typed capabilities everywhere else.
- **Reference-profile viewers are throwaway-safe.** No reuse of MultiPortfolioManager
  — compact tables are 100 lines and don't drag editing affordances into a
  read-only surface.
- **Diagnostic page extends, doesn't fork.** Same `lib/retirement` capability,
  richer inputs/outputs; same `/api/retirement/project` endpoint serves both
  the main retirement page and the diagnostic.
- **No god-file growth.** Edits to `multi-portfolio-manager.tsx` and
  `portfolio-table.tsx` = **zero**.

## Verification

1. **Compile:** `cd frontend && npx tsc --noEmit` → baseline 149 errors preserved;
   zero new errors in any new or edited file.

2. **DB sanity** (after A.1 reseed):
   ```bash
   cd frontend && npx tsx -e "
   import { prisma } from './src/lib/db';
   (async () => {
     const refs = await prisma.user.findMany({
       where: { isReferenceProfile: true },
       select: { email: true, referenceTitle: true, referenceDescription: true },
     });
     console.log(refs);
     await prisma.\$disconnect();
   })();
   "
   ```
   Expect 3 rows for John, Jane, Jack.

3. **In-process smoke** (after A.2 + D):
   ```ts
   import { listReferenceProfiles, copyReferenceSections } from '@/lib/reference';
   import { projectRetirement } from '@/lib/retirement';

   const refs = await listReferenceProfiles();        // expect 3
   const ret = await projectRetirement(userId, {
     retirementAge: 65, targetMonthlySpending: 5000,
     includeSocialSecurity: false,
   });
   // expect ret.inputsResolved.monthlyRetirementIncomeAtRetire dropped by SS amount
   // expect ret.inputsResolved.investableBreakdown has rows per account
   ```

4. **Playwright walkthroughs**:
   - **Unauthenticated visitor** → `/dashboard/portfolio` (Templates) shows a
     "Sign in to explore reference profiles" CTA — no reference user details
     leaked.
   - **Unauthenticated** → `/directory` renders the public surface list. The
     "Logged-in only" section shows reference-profiles, retirement diagnostic,
     etc. with "Sign in to access" badges.
   - **Unauthenticated** → `/dashboard/reference/<any-user-id>/portfolio` →
     middleware redirects to `/login` (auth check comes first; 404 check applies
     only after auth).
   - **Logged-in user** → `/dashboard/portfolio` shows 3 reference profile cards.
     Click "View portfolios" → `/dashboard/reference/[userId]/portfolio` renders
     the compact read-only table. Click "View income" → compact cash-flow list.
   - **Logged-in user** → `/dashboard/reference/<UNKNOWN-USER-ID>/portfolio` →
     404 (never leaks a non-reference user even when authenticated).
   - **Logged-in user (fresh, empty account)** → log in, go to Templates,
     click "Use as starting point" on John, check all 3 sections, confirm →
     `/dashboard/myportfolio` shows 1 new portfolio "Fidelity (from John Doe — Single,
     mid-career)" with 2 accounts + 5 assets. `/dashboard/income` shows John's
     cash flows added.
   - **Logged-in user, has existing portfolio** → pulls John → existing portfolio
     remains; new "(from John...)" portfolio appears alongside; existing profile
     fields NOT overwritten.
   - **Retirement diagnostic** → log in as `johndoe@mystocks.ai`, go to
     `/dashboard/retirement/diagnostic`. Toggle "Include Social Security" off →
     readiness drops noticeably. Override income to $20,000 → contributions
     double during accumulation; chart updates. Per-account breakdown shows two
     rows (Fidelity Roth IRA $36,100, Fidelity Brokerage $47,250), totals to
     $83,350 — exactly the Portfolio page's per-portfolio header values
     (validation visual).

5. **Nav verification**: Both top bars show "Directory" between Templates and
   Chat; clicking it goes to `/directory`.

## Risks / notes (to flag before execution)

- **Privacy of seed data**: Demo users have realistic salaries, expenses, SS
  estimates. With "logged-in only" scope they're not exposed to web crawlers,
  but every registered user can browse them. Acceptable for personas we
  explicitly authored as reference data. Make sure the `isReferenceProfile`
  flag is the ONLY door — no other users leak through. Reference viewers
  should 404 on non-reference users (not redirect, not show "private profile")
  to avoid hinting that other accounts exist at predictable URLs.
- **Price-source mismatch** (called out): Retirement reads raw `asset.price`;
  Portfolio applies a historical-lookup fallback. For seed users these match
  (seed sets `asset.price`). For real users running price updates, they could
  diverge. The diagnostic's per-account breakdown will surface this if a user
  hits it; fix-in-place when reported.
- **Profile-fields copy is one-way** (additive): a user pulling John's profile
  twice will only fill the first time (since second time the fields are filled).
  That's the intent — protects user data from accidental overwrite.
- **Pull-a-profile is one-shot, not subscribed**: the copy is a snapshot. If we
  later edit John's reference data, existing users who pulled him don't see
  updates. Acceptable for v1; explicit re-import works (would create duplicates
  with the same suffix — guard with a "you've already imported from this profile"
  warning).
- **Asset prices on copy**: We copy the `price` field as-is. When the receiving
  user opens their Portfolio page, the existing market-price lookup will refresh
  prices for symbols in the cache (yfinance hit). Symbols not in cache will
  retain the seeded price via the fallback fix. Both behaviors are correct.
- **Don't `npm run build`** during verification (clobbers dev `.next` cache).
  Use `tsc --noEmit` + the running dev server.

## What's NOT in this refactor (deferred)

- **Phase 4 Monte Carlo capability + sandbox**. We list the page on the
  Directory as "Coming soon"; we don't build it.
- **Versioning of reference profiles**. If we tweak the seed for the demo users
  later, existing copies in user accounts stay frozen.
- **Per-portfolio public flag** (`Portfolio.isPublic`). The current scope is
  user-level (whole user is reference or not). When we want a non-reference user
  to share a single portfolio publicly (a much later feature), revisit.
- **Admin UI for promoting users to reference**. Currently set via seed script.
  Easy to add later when needed.
- **Fixing the price-source mismatch in `lib/retirement`**. The diagnostic
  exposes it; fix when it bites.
