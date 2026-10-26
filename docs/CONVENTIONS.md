# Coding Conventions

Short, enforceable rules. Where a rule is automated it says **(lint)**, **(test)** or **(CI)**.

## 1. Next.js 16 specifics (this repo)

- **Read `node_modules/next/dist/docs/` before using a Next.js API** – this version differs from older releases (see `AGENTS.md`).
- `middleware` is now **`proxy.ts`**. It may refresh sessions and do optimistic redirects only; it is never authorisation.
- **Cache Components is OFF** (`cacheComponents: false`). Every page is per-user/dynamic. Do not add `'use cache'` to anything that touches user, wallet or school data. Revisit deliberately (decision A-11).
- Role-interface layouts call `requireInterface()`/`requireContext()` which calls `connection()` so they are never prerendered.
- Server Actions and Route Handlers **re-authorise every call**; never rely on a layout or the proxy.

## 2. Security & architecture rules

1. **Reads** use the user-session Supabase client (`lib/supabase/server.ts`) so RLS applies.
2. The **service-role client** (`lib/supabase/admin.ts`) is imported only from `services/**`, `app/api/webhooks/**`, `app/api/cron/**` **(lint)**, and is used to call named RPC functions – not ad-hoc queries.
3. Never place secrets in `NEXT_PUBLIC_*`. Read env only via `lib/env/*` (validated).
4. No `dangerouslySetInnerHTML` **(lint)**.
5. Validate every input with Zod at the boundary; the database constraints are the second line.
6. Never trust client-supplied role, school id, price, total, balance or "payment succeeded".
7. Errors: throw `AppError(code)`; map DB/provider errors at the service boundary; never show raw errors to users; log internals server-side only.
8. No PII, credentials or raw payment payloads in logs.

## 3. Money

- Integer **cents** everywhere (`Cents` branded type in `lib/wallets/money.ts`). Convert for display only via `formatRand`.
- No `parseFloat`, `toFixed`, or float arithmetic in money modules **(lint)**.
- Wallets/ledger are modified only by database functions; the UI never computes balances.
- Every money-moving operation carries an idempotency key.

## 4. TypeScript

- `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`. No `any` **(lint)**.
- Prefer `type` imports with inline `type` modifiers **(lint)**.
- Use discriminated unions + exhaustive `switch` for state machines (card status, checkout state, top-up status).
- Domain types in `lib/<domain>/types.ts`; database types generated from the schema (Phase 2) – do not hand-write row types.

## 5. React / UI

- Server Components by default; add `'use client'` only for interactivity.
- Reuse `components/shared` primitives (`PageHeader`, `StatCard`, `StatusBadge`, `EmptyState`, `ErrorState`, `LoadingState`).
- Every screen defines **loading, empty, error and success** states.
- Status must never rely on colour alone – use `StatusBadge` (icon + text).
- Touch targets ≥ 44 px (POS ≥ 48 px). Forms use React Hook Form + Zod resolvers with labelled inputs and inline errors.
- Accessibility: semantic landmarks, skip link, visible focus, `aria-live` for async status.

## 6. Database & migrations

- Forward-only SQL migrations in `supabase/migrations/`, one concern per file, timestamped.
- RLS enabled and forced on every table; `SECURITY DEFINER` functions set `search_path = ''`.
- Financial tables: no UPDATE/DELETE, no cascading deletes.
- Every schema change ships with tests (RLS matrix, grants audit, invariants) **(test/CI)**.

## 7. Testing

- Unit tests (`tests/unit`) for pure logic; integration tests (`tests/integration`) against a real Postgres for anything touching RLS, ledger or locking; e2e (`tests/e2e`) for journeys.
- A bug fix includes a regression test.
- Critical business logic is not "done" until tested.

## 8. Git

- Conventional commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`, `refactor:`), small PRs.
- Never commit secrets, `.env*` (except `.env.example`), or generated build output.
- Changes to `supabase/migrations/**` and `lib/supabase/admin.ts` require review.

## 9. Formatting

Prettier (`npm run format`), Tailwind class sorting via `prettier-plugin-tailwindcss`. `components/ui` (shadcn) is vendored and excluded from lint/format.
