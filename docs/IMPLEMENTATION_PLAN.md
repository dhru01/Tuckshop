# Implementation Plan

> Status: **Approved 2026-10-25. Phases 1–4 delivered; Phase 5 core on dev (`0009` + remote apply).**
> This file is the living plan; it is updated at the end of every phase (§9 tracker).

---

## 1. Delivery approach

- Build **phase by phase**; each phase ends with a report: completed work, created/modified files, tests run and results, unresolved issues, required configuration, what remains (template §8).
- A phase is **not complete** until its exit criteria and tests pass. Security- and money-critical tests run against a **real PostgreSQL**: a dedicated **hosted Supabase dev project** (decision D-1). RLS, grants, ledger-invariant and concurrency tests are written in **Vitest + `pg`** (role impersonation via `SET LOCAL ROLE` / `request.jwt.claims`) rather than pgTAP, because the local Supabase stack is not used. Each test run uses uniquely-named tenants and cleans up after itself, and refuses to run for `APP_ENV=staging|production`.
- Small, reviewable commits; migrations are reviewed SQL; no secrets in git.
- The development rules in the brief (§32) are enforced by lint rules, CI checks and tests where possible (e.g. no service-role import outside the allow-list, no float math in `lib/wallets`, grants audit).
- Effort is expressed in relative size (S/M/L/XL), not dates.

---

## 2. Long-lead items to start now (in parallel with Phase 1)

These have external lead times and block later phases if left late.

| Item | Needed by | Owner |
|---|---|---|
| Payment provider **sandbox + merchant account** for the pilot school (and confirm whether tokenisation/recurring, refunds API and split payments are enabled) | Phase 9 (verification spike earlier) | You / school |
| **Legal advice**: custody of prepaid funds, POPIA roles, DPA, privacy notice, refund/expiry policy | Before Phase 9 live; before any pilot data | You (attorney) |
| **NFC hardware sample order**: ~10 NTAG 424 DNA cards (and optionally DESFire EV3) + 2 reader types; decision on pre-encoded vs internal encoding | Phase 8 spike | You |
| Pilot school information: grades, break times, existing products/prices/barcodes, devices at the tuck shop (PC? tablet? OS/browser), network quality, barcode scanner model | Phase 3 (seed), Phase 7 | You / school |
| Accounts: Supabase (dev/staging/prod), Vercel, GitHub repo, email provider, Sentry, Upstash | Phase 1–2 | You |
| Domain name + email sending domain (SPF/DKIM) | Phase 9–11 | You |

---

## 3. Proposed adjustments to the requested phase order

Your phase list is followed, with these small refinements to avoid rework:

1. **Phase 2 creates *all* core tables, constraints, RLS and immutability triggers** (including wallets/ledger/cards/products schema), but the *behaviour* (functions) arrives in the phase named for it. Rationale: RLS and tenant integrity are far easier to get right as one coherent security model than bolted on piecemeal.
2. **Phase 4 (Parent portal) reads wallets/transactions** that only become writable in Phase 5; until then it uses seed data produced through the real (Phase 5) ledger functions in test fixtures. To avoid dead UI, I will **build the Phase 5 ledger functions' minimal core (post top-up/purchase) before Phase 4's wallet screens are wired**, i.e. effectively 5 → 4 for the wallet widgets. Final order within those two phases will be reported.
3. **A minimal simulated card reader lands in Phase 7** (POS cannot be tested without it); Phase 8 formalises card management, key verification and the hardware abstraction.
4. **A provider-verification spike opens Phase 9** (confirm ITN/webhook details, refunds, tokenisation) before writing the adapter.
5. **A hardware spike opens Phase 8** (see NFC_INTEGRATION §5).

---

## 4. Phases

Sizing: S ≈ days, M ≈ 1–2 weeks, L ≈ 2–4 weeks, XL ≈ 4+ weeks for one experienced developer + AI assistance. Indicative only.

### Phase 1 — Architecture and setup (M)
**Deliverables**
- Git repo initialised; `.gitignore`; conventional commits; branch/PR conventions.
- Next.js (App Router, TS strict), Tailwind, shadcn/ui, Lucide, Recharts, RHF, Zod configured.
- Folder structure per ARCHITECTURE §5; ESLint (incl. `no-restricted-imports` for service role, no-`dangerouslySetInnerHTML`), Prettier, Vitest, Playwright skeletons, CI workflow (lint, typecheck, unit, secret scan).
- Supabase client helpers (`server`, `browser`, `admin`), env validation (Zod) with `.env.example`.
- Design system foundation (tokens, typography, layout shells for four interfaces, status badges, empty/error/loading primitives).
- Supabase local setup (`supabase init`, `config.toml`) once tooling decision D-1 is made.
- README with setup instructions.
**Exit criteria**: app boots; lint/typecheck/tests pass in CI; env validation fails fast on missing secrets; no secrets in git.
**Dependencies**: D-1, D-12 (resolved).

### Phase 2 — Database and authentication (L)
**Deliverables**
- Migrations 0001–0006 (DATABASE_SCHEMA §16): enums, all core tables, indexes, composite tenant FKs, ledger/audit immutability triggers, default-privilege hardening, RLS policies for **every** table, helper functions.
- Supabase Auth integration: register, verify email, login, logout, forgot/reset password, MFA enrolment/challenge, profile creation trigger.
- `requireContext()`, role/context resolution, `/select-context`, context switcher, role-based redirects, unauthorised/no-membership/suspended pages.
- `proxy`/middleware for session refresh and coarse routing.
- Integration suites (Vitest + `pg`): RLS matrix (two schools × all roles), grants audit, immutability, tenant FK integrity.
**Exit criteria**: all RLS/grants tests green; manual proof that URL/cookie/payload tampering cannot elevate privileges.
**Dependencies**: **a hosted Supabase dev project** (URL, publishable key, secret key, DB connection string in `.env.local`).

### Phase 3 — School and learner management (L)
**Deliverables**
- School onboarding/activation/suspension/deactivation functions + super-admin screens (basic).
- School settings; staff invitations (cashier / school_admin), role & permission management, last-admin protection.
- Learners CRUD, CSV import (validated, preview, error report), grade assignment, deactivation; wallet auto-creation.
- Parent invitations, acceptance, approval/revocation (SECURITY §8), multi-guardian, multi-school parents.
- Audit logging for all of the above.
**Exit criteria**: end-to-end link journey works; negative tests (expired/reused/guessed invitation, other school's learner) pass.

### Phase 4 — Parent portal (L)
**Deliverables**
- Mobile-first shell and dashboard: summary cards, child cards, recent activity, quick actions.
- Children list/details, wallet view, transaction history (filters/pagination), spending controls (daily/weekly), freeze/unfreeze card, profile/settings, MFA setup, notification centre UI (data wiring in Phase 11).
- Loading/empty/error states; accessibility pass for this interface.
**Exit criteria**: a parent sees only their children's data (RLS tests); control changes are enforced server-side and audited.
**Note**: wallet numbers come from the ledger (see §3 item 2).

### Phase 5 — Financial ledger (L)
**Deliverables**
- Functions: ledger account/wallet creation, `post_ledger_transaction` internal primitive, wallet credit/debit, wallet adjustments (dual control), reversals, reconciliation (`run_reconciliation`), balance projection checks.
- Money utilities (`lib/wallets`): cents parsing/formatting, safe arithmetic, bigint handling.
- Admin/school views of ledger and reconciliation status.
- **Financial integrity test suite** (PAYMENTS_AND_LEDGER §12 subset): balancing, immutability, idempotency, concurrency (parallel connections), rollback, no negative balance.
**Exit criteria**: all invariants have passing automated tests including parallel-execution tests.

### Phase 6 — Product and inventory management (M)
**Deliverables**
- Categories (seeded defaults), product CRUD, barcode uniqueness validation, archive (no delete), image upload (validated), price updates, track-stock toggle.
- Stock adjustments, restock records, movement log, low-stock indicators, inventory reports, CSV import/export (with CSV-injection hardening).
**Exit criteria**: tenant isolation tests for products/inventory; stock never negative with tracking on; movement log reconciles to `stock_quantity`.

### Phase 7 — POS (XL)
**Deliverables**
- Touchscreen layout (categories, large product tiles, basket, totals, large checkout), barcode input (keyboard-wedge capture with prefix/timing handling), search fallback, unknown-barcode flow, quantity increments, products without barcodes.
- Shift open/close, POS device registration, connection indicator, inactivity lock.
- `pos_preview_checkout`, `pos_checkout`, `pos_get_purchase_status`, overrides with audit, purchase attempts logging, receipts (on-screen; printable).
- Checkout state machine (idle → tap → preview → confirm → processing → success/failure/unknown), idempotency, duplicate-click prevention, safe retry, basket preservation.
- Minimal `SimulatedReader` (dev only).
- Cashier transaction history; refund request screen (wired fully with approvals in Phase 5/7 functions).
**Exit criteria**: full purchase journey with simulator; failure matrix (insufficient funds, frozen card, unknown card, expired card, limit exceeded, stock insufficient, network drop, double-click) behaves per PAYMENTS_AND_LEDGER §6; accessibility/touch targets reviewed.

### Phase 8 — NFC integration (L)
**Deliverables**
- **Hardware spike** results documented (card type, reader, bridge, encoding).
- Card registration, assignment, activation, freeze/unfreeze, lost/stolen, replacement flows; `card_events`; parent + admin UIs; notifications hooks.
- Credential verification service (`ntag424_sdm` verifier, replay counter), pepper-based credential references, scheme gating (UID-only/simulated blocked in production).
- Reader abstraction finalised: `SimulatedReader`, `WebNfcReader`, bridge protocol spec + reference bridge (if hardware chosen), keyboard-wedge adapter.
**Exit criteria**: simulator-driven tests pass in CI; SDM verification passes with real test vectors/cards; cloned-UID card is rejected; documented list of tested hardware.

### Phase 9 — Payment integration (XL)
**Deliverables**
- **Provider verification spike** (docs vs account reality).
- Adapter for the chosen provider (default PayFast): hosted checkout, signature/validation, per-school credentials, webhook route, sandbox support.
- `create_top_up`, `apply_top_up_payment`, pending/redirected/expired handling, success/cancel pages (read-only status), polling status.
- Recovery cron (status query), reconciliation vs provider events, provider settlement import (CSV/API as available).
- Provider refunds for top-ups (if API supports), failed-payment handling.
- Integration tests with provider **sandbox** and signed-payload fixtures: duplicate, wrong amount/currency/reference, bad signature, late success.
**Exit criteria**: sandbox top-up credits exactly once; all webhook-abuse tests pass; no live credentials used in tests.

### Phase 10 — Dashboards and analytics (L)
**Deliverables**
- School dashboard metrics and charts (daily/weekly/monthly sales, top products, category split, transaction volume) with correct definitions (sales ≠ top-ups ≠ liabilities ≠ settled).
- Reports (daily/monthly sales, product performance, transactions, inventory, refunds, wallet reconciliation) with CSV export.
- Super-admin dashboards: schools, learners/parents counts, volumes, failures, MRR, health indicators; school management actions; users; payments; audit-log viewer; platform settings.
- Subscription plans/subscriptions/invoices (configurable pricing models; no hard-coded prices); support-access grants.
- Query/index optimisation based on measured plans.
**Exit criteria**: figures reconcile to the ledger in tests; super-admin cannot read tenant PII except via audited grant.

### Phase 11 — Notifications and automation (M)
**Deliverables**
- In-app notifications (+ Realtime badge), email channel via provider, outbox worker with retry/backoff, templates minimising child data, preference management with essential-category protection.
- Low-balance alerts (de-duplicated), purchase notifications (opt-in), card/refund/top-up events.
- Automatic top-ups **only if** provider capability is verified and enabled (PAYMENTS_AND_LEDGER §8); otherwise low-balance + one-click manual top-up.
**Exit criteria**: notifications fire from real events; preference rules enforced; auto top-up caps/duplicate-prevention tested (or documented as not offered).

### Phase 12 — Production readiness (L)
**Deliverables**
- Full security test pass, RLS regression suite, financial integrity suite, load/concurrency checks on checkout, performance optimisation.
- Accessibility review (WCAG 2.2 AA targets), error monitoring, health checks and alerts, backup/restore drill.
- Deployment configuration (Vercel, Supabase envs, domains, webhook URLs), runbooks, full documentation set (brief §31), seed/demo data safeguards.
- Operational readiness and launch checklists signed off (PRODUCTION_READINESS).
- Independent penetration test scheduled/completed.
**Exit criteria**: gates in PRODUCTION_READINESS §2 met; **no automatic production deploy or live-payment enablement** without your explicit approval.

---

## 5. Cross-cutting engineering standards

| Area | Standard |
|---|---|
| TypeScript | `strict`, no `any` without justification, exhaustive switch on enums, branded types for `Cents`, `SchoolId`, etc. |
| Money | Only integer cents; formatting via one utility; lint rule bans `parseFloat/Number(...)*` in finance modules |
| Errors | Typed domain errors; mapping table error-code → message; never leak DB text |
| Components | Reusable primitives in `components/ui`/`shared`; each screen has loading/empty/error/success states |
| Data access | Services own queries; UI never imports Supabase admin; server-side pagination |
| Migrations | Forward-only SQL, one concern per file, reviewed; destructive changes need explicit approval |
| Tests | Unit (Vitest), integration (Vitest + `pg` on a real Postgres: RLS, ledger, concurrency), e2e (Playwright, simulated NFC, payment sandbox/fixtures) |
| CI | lint → typecheck → unit → db tests → build → e2e (nightly/PR label); secret scan; dependency audit |
| Docs | Updated in the same PR as behaviour changes |
| Observability | Structured logs with request ids, Sentry with PII scrubbing |

---

## 6. Decisions needed from you

| ID | Question | Recommended default | Needed by |
|---|---|---|---|
| ~~D-1~~ | ✅ **Resolved:** hosted Supabase dev project; DB tests via Vitest + `pg` | | |
| ~~D-2~~ | ✅ **Resolved:** PayFast first | | |
| ~~D-3~~ | ✅ **Resolved:** school-owned merchant account (`school_merchant`) | | |
| D-4 | NFC credential strategy for the pilot: **NTAG 424 DNA + SDM**? Willing to run a hardware spike? | Yes | Phase 8 |
| D-5 | Card encoding: vendor pre-encoded vs internal encoding station | Decide after spike | Phase 8 |
| D-6 | Email provider | Resend | Phase 11 |
| D-7 | Rate limiting store | Upstash Redis | Phase 2 |
| D-8 | Error monitoring | Sentry | Phase 12 (earlier ok) |
| D-9 | Pilot school details (grades, break times, hardware, products, network) | Provide when available | Phase 3/7 |
| D-10 | Hosting regions (Supabase af-south-1, Vercel Cape Town) | Use if available | Phase 1–2 |
| D-11 | Legal engagement (custody, POPIA, DPA, refund/expiry policy) | Start now | Before pilot |
| ~~D-12~~ | ✅ **Resolved:** npm | | |
| D-13 | Guardian permission defaults: all approved guardians can top-up; only those flagged `can_manage_controls` change limits? | Yes | Phase 3 |
| D-14 | Suspended school: block both purchases and top-ups? | Yes | Phase 3 |
| D-15 | Refund approval threshold for cashiers (cents) | e.g. R50 self-approve with permission; above needs admin | Phase 7 |
| D-16 | Brand/product name, logo, colour direction | Neutral placeholder until provided | Phase 1 |
| D-17 | Should the school pay provider fees, or add a parent-paid fee to top-ups? | School-absorbed (no surcharge) | Phase 9 |

---

## 7. Key risks

| Risk | Impact | Mitigation |
|---|---|---|
| Custody/regulatory classification of prepaid funds | Cannot go live | Legal advice early; per-school merchant accounts; configurable model |
| NFC reader/browser limitations | POS UX/hardware blocked | Abstraction + hardware spike; local bridge/dedicated POS app fallback |
| Cards not cryptographically secure | Fraud | Use NTAG 424 DNA/DESFire; UID-only disabled in prod |
| Provider capabilities differ from docs/account | Rework | Phase 9 spike; adapter interface; capability flags |
| Concurrency bugs in ledger | Financial loss | DB-level locks/constraints; parallel tests; reconciliation alerts |
| RLS mistakes | Data leak | Default deny, RLS integration matrix, composite FKs, grants audit |
| Unreliable school Wi-Fi | Lost sales | Idempotent retry, "outcome unknown" state, clear indicators; offline deferred |
| Scope size | Delays | Phased delivery, early pilot-critical path, explicit non-goals |
| No Docker locally; shared hosted dev DB | Tests could collide with manual data | Per-run unique tenants + cleanup; never run against staging/production; Vitest+`pg` for RLS/concurrency |

---

## 8. End-of-phase report template

1. Summary of completed work
2. Files created/modified
3. Tests run (with results) and coverage notes
4. Unresolved issues / deviations from plan
5. Required configuration (env vars, accounts, dashboard settings)
6. Updates made to this plan
7. What remains

---

## 9. Progress tracker

| Phase | Status | Notes |
|---|---|---|
| 0 – Planning documents | ✅ Complete | Approved 2026-10-25 |
| 1 – Architecture and setup | ✅ Complete (2026-10-25) | See Phase 1 report in the chat / README. Unit 107 ✔, e2e 14 ✔, lint ✔, typecheck ✔, build ✔ |
| 2 – Database and authentication | ✅ Complete | Migrations 0001–0006; auth + context. RLS matrix tests need `DATABASE_URL` in `.env.local` for CI/local integration runs. |
| 3 – School and learner management | ✅ Complete (pilot) | Onboarding, roster CSV, invites, pilot NFC UID. See `docs/PILOT_WALKTHROUGH.md`. |
| 4 – Parent portal | ✅ Complete (core) | Dashboard, children, wallet, transactions, spending controls, settings. `/parent/top-up` placeholder until Phase 9. |
| 5 – Financial ledger | 🚧 In progress | `0009`: `post_ledger_transaction`, `pilot_fund_wallet`, `debit_wallet_ledger`, `run_reconciliation`; school pilot fund UI + reconciliation page; `tests/integration/ledger.test.ts`. Remaining: reversals, dual-control adjustments, concurrency suite, admin ledger views. |
| 6 – Product and inventory | 🚧 In progress | Migration `0010`: movements, category seed, product/inventory RPCs; school Products + Inventory UI, CSV import/export. Remaining: storage bucket setup for images, fuller inventory reports. |
| 7 – POS | ✅ Core delivered | Checkout + shifts + transactions; refunds (`0013`: request/approve, R50 auto-approve threshold). Remaining: Phase 8 hardware reader, failure-matrix integration tests, printable receipts. |
| 8 – NFC integration | 🚧 In progress | Migration `0014` (local + hosted): `card_events`, lifecycle RPCs, `pos_validate_credential_for_checkout`, replay counter hook; `lib/nfc/*`, simulated + keyboard-wedge on POS; school card admin UI; `docs/HARDWARE_SPIKE.md`. Remaining: hardware spike sign-off, production SDM verifier + keys, Web NFC/PC-SC bridge, parent freeze → `card_events`. |
| 9 – Payment integration | ⏳ | |
| 10 – Dashboards and analytics | ⏳ | |
| 11 – Notifications and automation | ⏳ | |
| 12 – Production readiness | ⏳ | |
