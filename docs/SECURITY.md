# Security and Privacy

> Status: **Proposed – awaiting approval (pre-Phase 1)**
> This document describes **technical and organisational controls we will build**. It is not legal advice, and it does **not** assert that the platform is POPIA-compliant. Items needing legal review or operational evidence are tracked in [PRODUCTION_READINESS §6](./PRODUCTION_READINESS.md).

---

## 1. Principles

1. **Defence in depth** – UI check → server authorisation → database RLS/functions → constraints. Any one layer failing must not expose data or money.
2. **Default deny** – every table has RLS enabled and forced; no policy = no access. Every function has explicit `EXECUTE` grants.
3. **Least privilege** – users, server code and jobs get the smallest set of capabilities needed.
4. **Never trust the client** – role, school, price, balance, totals and "payment succeeded" flags are always recomputed or re-verified server-side.
5. **Financial integrity by construction** – constraints and append-only triggers, not just application code.
6. **Data minimisation** – collect what the product needs; nothing else (no ID numbers, no DOB, no photos in v1).
7. **Auditability** – sensitive actions leave tamper-resistant records.

---

## 2. Threat model (STRIDE-oriented summary)

| Area | Threat | Primary controls |
|---|---|---|
| Spoofing | Credential stuffing, stolen sessions | Supabase Auth, rate limiting, MFA for admins, short-lived JWTs, httpOnly cookies, POS inactivity lock |
| Tampering | Modify role/school/price/balance in requests | Server-side re-derivation; RLS; composite FKs; money functions only via service role + internal re-check |
| Repudiation | Staff deny refunds/overrides | Append-only `audit_logs`, actor + request id, override reasons |
| Information disclosure | Cross-school or cross-parent data leak | RLS matrix, tenant tests (integration), column-level limits for cashiers, aggregate-only super-admin views |
| Denial of service | Webhook/endpoint flooding, expensive reports | Rate limits, body-size limits, pagination, query timeouts, indexed reports |
| Elevation of privilege | Cashier→admin, parent→other child, URL/role tampering | Roles read from DB each request, no roles in JWT, grant tests, `requireContext()` |
| Payments | Forged webhook, replay, amount tampering | Signature + provider validation + amount/currency/ref checks + idempotency |
| NFC | Clone/replay | Cryptographic credentials, counters, disable UID-only in prod (see NFC_INTEGRATION) |

---

## 3. Authentication and sessions

- **Supabase Auth**, email + password; **email verification is required** before any role context is usable.
- **Password policy**: length-first (≥ 10), breached-password check if enabled in Supabase project settings, no composition theatre.
- **MFA (TOTP)**: mandatory for `super_admin` (enforced via AAL2 check in every admin RPC wrapper and `requireContext`) and `school_admin`; available to parents and cashiers.
- **Sessions**: `@supabase/ssr` cookie sessions (httpOnly, Secure, SameSite=Lax); the middleware/proxy refreshes tokens; server code uses `supabase.auth.getUser()` (validated with Auth server), never an unverified decoded cookie.
- **POS device hygiene**: inactivity auto-lock (default 10 min, configurable), cashier re-authentication by password/PIN to resume, explicit sign-out at end of shift, shift tied to cashier and device.
- **Password reset**: generic responses (no account enumeration), reset links single-use and short-lived; redirect URLs allow-listed in Supabase.
- **Account disabling**: `profiles.status = 'disabled'` or `role_assignments.status = 'disabled'` takes effect on the next request (and revokes sessions via the Auth admin API).
- **Auth errors** shown to users are generic: invalid credentials, unverified email, account disabled, session expired, missing membership — no internals.

---

## 4. Authorisation layers

1. **`requireContext({ role, schoolId? })`** (server): loads active `role_assignments`, verifies school `status`, verifies MFA level where required, returns a typed context. Called by every layout, Server Action and Route Handler. Cookie-stored "active context" is a preference only.
2. **Services** accept a context object, never raw ids from the client as authority.
3. **Database**: RLS for reads and low-risk writes; `SECURITY DEFINER` functions for sensitive writes, each of which re-checks the actor (`p_actor_id`) against `role_assignments` itself.
4. **Permissions**: cashier/staff fine-grained permissions (e.g. `pos.refund.request`, `pos.override`, `inventory.adjust`) validated against an allow-list and checked in SQL.
5. **Multiple roles**: authorisation is per `(role, school)` context; an admin acting as a parent has parent privileges only in that context.

Anti-escalation specifics:
- Role/permission changes are RPC-only; a user cannot modify their own `role_assignments`.
- A school admin cannot grant `super_admin` or roles at other schools (CHECK + function logic).
- The last active `school_admin` of a school cannot be removed/disabled (function check).

---

## 5. Tenant isolation and RLS

- `school_id` on all school-owned data; composite FKs `(school_id, id)` prevent cross-tenant references even from privileged code.
- Helper functions in `private` schema: `has_role`, `is_staff`, `has_permission`, `is_guardian_of`. They are `SECURITY DEFINER`, `STABLE`, `search_path = ''`, return booleans only, and are called as `(select private.fn(...))` in policies for planner caching.
- **Policies** follow the matrix in DATABASE_SCHEMA §13. Cashiers have **no table access to learners/wallets**; they obtain the minimum identification (first name, last initial, grade, balance) through the checkout RPC result.
- **Parents** reach children only via active `parent_learner_relationships`.
- **Super-admin** has no blanket tenant-table SELECT. Platform dashboards use aggregate RPCs/views without learner PII. For troubleshooting, a **support access grant** (school-approved, time-boxed, scoped, audit-logged) is proposed (Phase 10).
- **Suspended/deactivated schools**: the money functions refuse new purchases/top-ups; staff retain read access to history; deactivated schools become read-only (admin/export only).
- **Testing**: an integration suite (Vitest + `pg`, impersonating each role) creates two schools with users of every role and asserts allow/deny for every table and function (see §14).

---

## 6. Privileged code, secrets and key management

### Service-role usage (allow-list)
`lib/supabase/admin.ts` (`import 'server-only'`) may be imported **only** by:
`services/wallet-service`, `services/pos-service`, `services/payment-service`, `services/card-service`, `services/inventory-service` (RPC calls), `app/api/webhooks/**`, `app/api/cron/**`, and the auth bootstrap for invitations. A lint rule and CI check fail the build on any other import. The service role is used to **call named RPCs**, not to run ad-hoc table queries.

### Secrets
| Secret | Where | Notes |
|---|---|---|
| Supabase URL, publishable key | `NEXT_PUBLIC_*` (client-safe) | Public by design; protection comes from RLS |
| Supabase **secret/service key** | Server env only (Vercel encrypted env, `.env.local` locally) | Never `NEXT_PUBLIC_`; never logged |
| Payment credentials / webhook secrets | Per-school encrypted `school_payment_credentials` (envelope encryption; KEK in env/KMS) and/or env vars for platform-level sandbox | Rotatable; `key_version` tracked |
| NFC master key(s) | KMS/Vault secret, versioned | Never in DB plaintext or client |
| Email provider key, cron secret, Sentry DSN (server) | Server env | |
| Credential-reference pepper | Server env/KMS | HMAC key for card identifiers |

Controls: `.env*` git-ignored, `.env.example` placeholders only, secret scanning (gitleaks) in CI and pre-commit, separate keys per environment, rotation runbook, no secrets in logs/Sentry (scrubbers).

---

## 7. Application security controls

### Input validation
- Zod schemas for every Server Action / Route Handler input; shared with client forms.
- Database CHECK/UNIQUE/FK constraints as the second line (amount ranges, enums, phone format, barcode patterns).
- Quantity/line-count/size limits on checkout payloads.

### Rate limiting (initial targets, tunable)
| Endpoint | Limit |
|---|---|
| Login / registration / password reset | per IP and per email, e.g. 5/min, 30/hour |
| Invitation acceptance | per user & IP, 5 failed attempts then lock invitation temporarily |
| Top-up creation | per user, e.g. 10/hour |
| `pos_preview/checkout` | per device & cashier (burst-friendly, e.g. 60/min) plus failed-credential throttle per device |
| Webhooks | per IP/school, only after signature check fails cheaply |
| CSV import/export | per user |

### CSRF
- Server Actions use Next.js built-in Origin/Host checks; additional explicit `Origin` verification on cookie-authenticated Route Handlers that mutate.
- Webhooks use signatures instead of cookies. Cron endpoints use a secret header.
- `SameSite=Lax` cookies; no state-changing GET endpoints.

### XSS and injection
- React escaping by default; **no `dangerouslySetInnerHTML`** with user content (lint rule). Strict **CSP** (nonces), `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors 'none'`, HSTS.
- SQL: only parameterised queries/RPC; any dynamic SQL in functions uses `format('%I'/'%L')` with allow-lists.
- **CSV export hardening**: neutralise cells beginning with `= + - @ \t \r` (CSV/formula injection). CSV import validated, size-limited, rejected row report.
- Product/receipt text sanitised on input and output.

### Errors
User-safe messages mapped from typed error codes; internal details only in secured logs with request ids.

---

## 8. Guardian (parent-learner) linking security

- Learners are created by the school; **no self-service lookup by name**.
- Invitations: ≥128-bit random token, only `sha256` stored, one-time use, expiry (default 7 days), revocable, optionally email-locked.
- Acceptance requires an authenticated user with a **verified email**; if the invitation is email-locked, the verified email must match.
- Non-email-locked invitations and additional guardians land in `pending_approval` for a school admin to approve.
- Brute-force protection (attempt counter, rate limit, generic errors).
- Every create/accept/approve/revoke is audited. Revocation is immediate and removes parent access (including Realtime).
- Parents with children at different schools: one `parent` role, multiple relationships; each child's data is isolated by learner/school.

---

## 9. Audit logging

`audit_logs` fields: `occurred_at, actor_id, actor_role, school_id, action, entity_type, entity_id, outcome, metadata (jsonb, whitelisted keys), request_id, ip_hash`.

Required events: card registration/assignment/replacement/freeze/unfreeze/lost/stolen/deactivation; wallet adjustments; refund request/approval/completion; spending-limit and restriction changes; staff invitation/role/permission/disable changes; school create/activate/suspend/deactivate; administrative overrides; guardian link/approve/revoke; payment-provider config changes; top-up reversals; data-subject requests and exports; super-admin access to tenant-scoped data; failed authorisation on privileged actions (`outcome = denied`).

Protections: append-only (triggers + revoked privileges), written by `SECURITY DEFINER` code only, optional hash chain (`prev_hash`/`row_hash`) for tamper evidence, retention longer than operational data, read access limited (school admins see their school; super-admin sees all).
**Never logged:** passwords, tokens, payment credentials, full card credentials, raw provider payloads (beyond scrubbed event store), unnecessary personal data.

---

## 10. POPIA and child data protection (framework, not a compliance claim)

### 10.1 Likely roles — **to be confirmed by counsel**
| Party | Likely POPIA role | Rationale |
|---|---|---|
| Participating school | **Responsible party** | Determines why/how learner and guardian data are processed for tuck-shop payments |
| Platform operator (us) | **Operator** (processes on behalf of the school) | Provides the software; acts on school's instructions under a written agreement |
| Parent/guardian | **Data subject** (own data) and a **competent person** acting for the child | Provides consent/authorisation for child data where required |
| Learner | **Data subject (child)** | Special protections for children's personal information |
| Payment provider | Independent responsible party / operator depending on arrangement | Their own terms and privacy notice apply |
| Email/hosting/monitoring vendors | Sub-operators | Must be covered by operator agreements and transfer assessment |
If the platform also determines its own purposes (analytics, marketing, product improvement using child data) it may become a responsible party for those; we will **not** do that in v1.

### 10.2 Controls we will build
| Obligation area (indicative) | Technical/organisational control |
|---|---|
| Lawful basis & children's data (POPIA Part B, children's information provisions) | Do **not** assume registration = lawful basis for children's data. Record guardian authorisation/acknowledgement (`consent_records`) linked to school + learner + notice version; school-controlled guardian verification via invitation; processing limited to the tuck-shop purpose |
| Purpose specification & minimisation | Schema collects only: learner name, grade, school admission reference, wallet/transaction data, guardian name/email/phone. No ID numbers, DOB, addresses, photos, medical/dietary data |
| Notification of collection / openness | Versioned privacy notices (`legal_documents`) shown at registration and in settings; acknowledgement recorded |
| Security safeguards | RLS, encryption in transit (TLS) and at rest (Supabase/Postgres disk encryption, encrypted secrets), MFA for admins, audit logging, least privilege, backups, pen-test |
| Operator agreement | DPA template (see §10.3); `school_agreements` records acceptance before school activation |
| Breach notification | `incident_reports` workflow + runbook: detect → contain → assess → notify the Information Regulator and affected data subjects/schools "as soon as reasonably possible" (exact duties/timelines per counsel) |
| Access, correction, deletion | `data_subject_requests` workflow; guardian self-service edit of own profile; school-mediated learner corrections; export of a data subject's data |
| Retention & disposal | Configurable per school (`retention_months_*`); **financial records retained** for the legally required period (confirm — tax and accounting law, typically multi-year) while **learner PII is anonymised** (`anonymised_at`, names replaced) once purpose ends; ledger keeps pseudonymous ids |
| Access logging | Audit log of privileged access; support-access grants; super-admin tenant access is logged |
| Cross-border transfers | Prefer Supabase `af-south-1` and Vercel Cape Town region where available; document any vendor processing outside SA (email, Sentry) and ensure adequate protection/agreements; scrub PII from monitoring |
| Account deactivation | Learner `inactive/left`, card deactivation, guardian revocation; user deletion = anonymise profile while preserving financial integrity |
| Direct marketing | None in v1; transactional notifications only |

### 10.3 Data processing agreement framework (outline for counsel)
Parties and roles; subject matter, duration, nature and purpose; categories of data and data subjects (incl. children); instructions and limits on use; confidentiality of personnel; security measures (annex); sub-operators and approval process; assistance with data-subject requests; breach notification timing and content; audit/inspection rights; location/transfer of data; return/deletion at termination (while preserving legally required financial records); liability and indemnities; governing law. The final agreement must be drafted/reviewed by a South African attorney.

### 10.4 What we will **not** claim
The product UI, marketing and docs will not state "POPIA compliant". They may describe controls implemented. Compliance depends on school/operator agreements, notices, governance, registrations (e.g. Information Officer) and operations outside the codebase.

---

## 11. Notifications and privacy
- Emails/in-app messages use first name only (or "your child"), no balances or full names unless the user is inside the authenticated app. Low-balance and top-up emails link into the portal.
- Essential security/financial notifications (card frozen/replaced, failed top-up/auto top-up, refunds) cannot be disabled; others are preference-controlled.

---

## 12. Storage and uploads
- Buckets: `product-images` (public-read per object path including `school_id`, **write only via RLS-checked school admin**), `school-logos`, `exports` (private, signed URLs, short TTL).
- Server-validated MIME/magic bytes, max size (e.g. 2 MB), image re-encoding, randomised filenames, no SVG uploads (XSS).
- Learner photos are not stored.

---

## 13. Supply chain, headers, ops hardening
- Lockfile committed, `npm audit`/Dependabot, minimal dependencies, pinned versions.
- Secret scanning in CI, pre-commit hooks, branch protection, required reviews for `supabase/migrations` and `lib/supabase/admin.ts` changes.
- Security headers + CSP; `poweredByHeader` off.
- Separate Supabase projects for dev/staging/production; production DB access restricted; point-in-time recovery enabled (verify plan).
- Dependency on Edge/Cron endpoints protected with secrets and idempotent.

---

## 14. Security testing (mapped to brief §26)

| Test | Layer |
|---|---|
| Two-school fixtures; every role × every table SELECT/INSERT/UPDATE/DELETE | Integration (Vitest + `pg`, role impersonation) |
| Grants audit: every `public` function's EXECUTE grants equal the allow-list; `anon` has none on sensitive objects | Integration (Vitest + `pg`) |
| Parent reads/writes another family's learner/wallet/transactions | Integration |
| Cashier tries admin actions, refund without permission, edits wallet/ledger/products directly | Integration |
| Direct PostgREST write to `wallets`, `ledger_*`, `purchases`, `nfc_cards.status` as every role | integration |
| Role/URL/cookie tampering | integration + e2e |
| Webhook forgery, replay, wrong amount | integration |
| Invalid/replayed/cloned NFC credentials | integration |
| CSV injection, XSS payloads in product names | unit/e2e |
| Rate limiting effectiveness | integration |
| Dependency and secret scanning | CI |
| Independent penetration test | pre-launch (Phase 12) |
