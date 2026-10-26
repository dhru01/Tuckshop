# Tuckshop

NFC-enabled school tuck shop payment and management platform for South African primary schools.
Multi-tenant SaaS: parent portal, school administration, tuck shop POS and a platform admin console,
all on one Next.js app and one Supabase backend.

> **Status: Phase 2 in progress (database + authentication).** Core schema and RLS are on the hosted
> dev project; sign-in, registration, context selection and MFA are wired. Ledger behaviour, POS and
> payments are **not built yet**. Unimplemented product screens still show an explicit placeholder.
> Nothing in this repository processes real money.
> See [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) for the phase tracker.

## Documentation

| Document                                                     | Purpose                                           |
| ------------------------------------------------------------ | ------------------------------------------------- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)                 | System architecture, interfaces, decisions        |
| [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md)           | Proposed schema, RLS matrix, migrations plan      |
| [docs/PAYMENTS_AND_LEDGER.md](docs/PAYMENTS_AND_LEDGER.md)   | Custody model, provider evaluation, ledger, flows |
| [docs/NFC_INTEGRATION.md](docs/NFC_INTEGRATION.md)           | Card/reader strategy and threat model             |
| [docs/SECURITY.md](docs/SECURITY.md)                         | Security controls, POPIA framework                |
| [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md)   | Phases, decisions, progress                       |
| [docs/PRODUCTION_READINESS.md](docs/PRODUCTION_READINESS.md) | Release gates, deployment, compliance checklist   |
| [docs/CONVENTIONS.md](docs/CONVENTIONS.md)                   | Coding conventions                                |

## Prerequisites

- Node.js **22+** (developed on 24) and npm
- A **Supabase DEV project** (hosted) – needed from Phase 2 onward
  (no Docker is required; see "Database workflow" below)
- A PayFast **sandbox** account – needed from Phase 9

## Quick start

```bash
npm install
cp .env.example .env.local
# Fill in .env.local (see "Environment" below). For a quick UI look without Supabase:
#   SKIP_ENV_VALIDATION=1 UI_SHELL_PREVIEW=true npm run dev
npm run dev
```

Open <http://localhost:3000>.

### Supabase Auth (Phase 2)

In the Supabase dashboard → **Authentication → URL configuration**, set:

- **Site URL:** `http://localhost:3000` (or your `NEXT_PUBLIC_APP_URL`)
- **Redirect URLs:** `http://localhost:3000/auth/callback` (and your production URL when deployed)

New parents register at `/register` (email verification required). Staff and platform admins are
granted via `role_assignments` (see `supabase/seed/bootstrap-super-admin.sql`).

### UI shell preview (development only)

Without a session, protected interfaces redirect to `/login`. To browse layouts without signing in,
start the dev server with

```bash
UI_SHELL_PREVIEW=true SKIP_ENV_VALIDATION=1 npm run dev
```

The preview **grants no data access** (there is no Supabase session, so RLS would deny everything),
defaults to off, is ignored when `APP_ENV=production`, and the app refuses to boot in production
with it enabled.

## Environment

All variables are documented in [`.env.example`](.env.example). Highlights:

| Variable                                                           | Notes                                                                        |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | From Supabase → Project Settings → API. Browser-safe.                        |
| `SUPABASE_SECRET_KEY`                                              | **Server only**; bypasses RLS. Never prefix with `NEXT_PUBLIC_`.             |
| `DATABASE_URL`                                                     | Dev project Postgres connection string (`npm run db:migrate`, integration tests). |
| `AUTH_CONTEXT_SECRET`                                              | Signs the active-context cookie (required in production; dev may fall back to service key). |
| `APP_ENV`                                                          | `development` \| `test` \| `staging` \| `production`                         |
| `UI_SHELL_PREVIEW`, `SIMULATED_NFC_ENABLED`                        | Dev-only switches; refused in production                                     |
| `PAYFAST_*`                                                        | Sandbox credentials only (Phase 9)                                           |

Validate your configuration the same way the server does at start-up:

```bash
npm run env:check
```

Configuration is validated at server start (`instrumentation.ts`) and the app fails fast with the
names of missing/invalid variables (never their values). `SKIP_ENV_VALIDATION=1` bypasses this and is
intended only for CI builds and tooling.

**Never commit `.env.local` or any secret.** Only `.env.example` (placeholders) is tracked.

## Scripts

| Command                           | What it does                                                      |
| --------------------------------- | ----------------------------------------------------------------- |
| `npm run dev` / `build` / `start` | Next.js                                                           |
| `npm run lint`                    | ESLint, including project guard-rails (see below)                 |
| `npm run typecheck`               | `tsc --noEmit` (strict)                                           |
| `npm test`                        | Unit tests (Vitest)                                               |
| `npm run test:integration`        | Integration tests against your hosted **dev** database (Phase 2+) |
| `npm run test:e2e`                | Playwright (builds and serves a production build)                 |
| `npm run verify`                  | lint + typecheck + unit tests + build                             |
| `npm run format`                  | Prettier                                                          |

### Automated guard-rails

ESLint fails the build when code:

- imports the service-role client (`lib/supabase/admin`) outside `services/**`, `app/api/webhooks/**`, `app/api/cron/**`;
- uses `dangerouslySetInnerHTML`;
- uses `parseFloat` / `toFixed` in money modules (`lib/wallets`, wallet/POS services).

## Project structure

```
app/                 Next.js routes: (auth)/, parent/, pos/, school/, admin/, api/ (later)
components/          ui/ (shadcn), shared/ (design system), pos/, parent/, school/, admin/
lib/                 env/, supabase/, auth/, errors/, wallets/ (money), navigation.ts, ...
services/            business services (added from Phase 3)
supabase/            migrations/ and seed.sql (added in Phase 2)
tests/               unit/, integration/, e2e/
docs/                architecture and planning documents
proxy.ts             session refresh + optimistic redirects (NOT an authorisation boundary)
instrumentation.ts   fail-fast environment validation
```

## Database workflow (hosted Supabase dev project)

Decision D-1: the team uses a **hosted Supabase dev project** (no local Docker).
Consequences, documented in [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md):

- Migrations in `supabase/migrations/` are applied with the Supabase CLI against the dev project
  (`npx supabase link` + `npx supabase db push`) – introduced in Phase 2.
- RLS, ledger and concurrency tests are written in Vitest using `pg` against the dev database
  (`npm run test:integration`), using throw-away schemas/rows and role impersonation
  (`SET ROLE authenticated` + `request.jwt.claims`). They refuse to run if `APP_ENV` is
  `staging` or `production`.
- Use a **separate** Supabase project for staging and production.

## Safety principles (summary)

- Money is integer cents; wallets change only through audited, idempotent database functions.
- Payments are credited only after server-verified provider notifications.
- UID-only NFC payments and the simulated card reader are disabled in production.
- Live payments are never enabled automatically (`payments_enabled` defaults to `false` per school).
- This software does not by itself establish legal (e.g. POPIA) compliance.
