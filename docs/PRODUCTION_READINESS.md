# Production Readiness

> Status: **Planning checklist – nothing here is complete yet.**
> Rule: **No automatic production deployment and no live-payment enablement without your explicit, recorded approval.** `payments_enabled` defaults to `false` per school; going live is a deliberate, audited super-admin action after the gates below.

---

## 1. Purpose

A single place to track what must be true before (a) a pilot with real learners' data, (b) live payments and (c) real NFC cards in production. Each item needs an **owner** and **evidence** (link/screenshot/test run/document). Items marked ⚖ require legal review; they are not satisfied by code alone.

---

## 2. Release gates

| Gate | Meaning | Required before |
|---|---|---|
| **G0 – Dev complete** | Acceptance journey (brief §33) passes in dev/staging with sandbox payments and simulated NFC | Any pilot discussion |
| **G1 – Staging soak** | Staging run with realistic data; load/concurrency, security tests, restore drill pass | Pilot with real data |
| **G2 – Legal & privacy ready** ⚖ | Custody model approved, DPA signed, privacy notices live, Information Officer/process in place | Real learner/guardian data |
| **G3 – Payments live-ready** | Merchant account live + verified; live webhook tested end-to-end with a minimal real transaction approved by you; reconciliation process rehearsed | Enabling `payments_enabled` for any school |
| **G4 – NFC production-ready** | Physical cards + readers tested; cloning/replay tests pass; UID-only disabled; simulator disabled | Using real cards |
| **G5 – Operations ready** | Monitoring, alerting, backups, runbooks, support process, on-call defined | Go-live |

---

## 3. Environments and deployment

| Environment | Supabase | Vercel | Payments | NFC |
|---|---|---|---|---|
| Local | Local stack (Docker) or dev project | `next dev` | Sandbox / signed fixtures | Simulator |
| Preview (PR) | Shared dev/staging DB or ephemeral branch | Preview deploys | Sandbox | Simulator |
| Staging | Separate project, production-like config | Staging project | Sandbox | Simulator + test cards |
| Production | Separate project, restricted access, PITR on | Production project | **Disabled until G3**, then live | Real cards only; simulator hard-disabled |

**Configuration**
- Env vars per environment (see `.env.example`): `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` (server only), payment sandbox/live credentials (per environment, server only), webhook secrets, `EMAIL_API_KEY`/`EMAIL_FROM`, `CRON_SECRET`, `CREDENTIAL_PEPPER`, `NFC_MASTER_KEY_*`, `ENCRYPTION_KEK`, `SENTRY_*`, `APP_ENV`.
- Production start-up checks: refuse to boot if `APP_ENV=production` with simulator enabled, UID-only allowed, test payment credentials, or missing secrets.
- **Migrations**: Supabase CLI in CI (`supabase db push` to staging automatically; to production via a manually approved workflow). Forward-only; backup/PITR marker before each production migration; rollback = forward fix or restore plan documented per migration.
- **Auth config**: site URL and redirect allow-list, email templates, SMTP provider, email confirmation required, MFA enabled, password protection settings, rate-limit settings in Supabase.
- **Domains**: production domain, `www`/apex redirect, TLS, HSTS, email sending domain (SPF/DKIM/DMARC), payment webhook URL per school, provider return URLs.
- **Regions**: Supabase and Vercel regions chosen for South Africa where available (verify, D-10).
- **Vercel cron**: schedules for notification dispatch, pending top-up recovery, reconciliation, housekeeping; `CRON_SECRET` header.

---

## 4. Backup and recovery

| Item | Plan |
|---|---|
| Database backups | Supabase daily backups + **Point-in-Time Recovery** enabled on production (confirm plan availability) |
| Targets (proposed) | RPO ≤ 15 min, RTO ≤ 4 h — to be agreed with the school |
| Logical exports | Weekly encrypted export of ledger/purchases/top-ups to separate storage (belt and braces for the financial record) |
| Restore drill | Quarterly, and before go-live: restore to a fresh project, run reconciliation, confirm zero variance |
| Storage (images) | Recreatable; included in backup policy where available |
| Secrets | Recovery procedure for losing KEK/NFC master key (offline sealed backup of key material, access-controlled) |
| Runbooks | DB restore, rollback of a bad deploy, provider outage, webhook backlog replay, key rotation |

---

## 5. Monitoring, alerting and incident response

**Alerts (page/notify)**
- Ledger imbalance or wallet↔ledger variance ≠ 0.
- Webhook signature failures spike; webhook processing errors; backlog of unprocessed provider events.
- Top-ups pending > N minutes; checkout error rate; p95 checkout latency.
- Failed cron jobs; email delivery failures; auth anomaly (login failure spike).
- Suspended-school purchase attempts, repeated `REPLAY_DETECTED`/`INVALID_CREDENTIAL`.

**Health indicators for the super-admin dashboard**: DB reachability, last reconciliation result, last cron runs, webhook lag, email queue depth, error rate.

**Incident response**: severity levels, contact tree, containment steps (disable school payments, disable card scheme, rotate keys), evidence preservation, breach-notification decision workflow ⚖ (see §6), post-incident review template; `incident_reports` register.

---

## 6. Compliance checklist (requires legal review / operational evidence) ⚖

> Section references to POPIA and other laws are indicative and must be confirmed by a South African attorney. Technical controls support these items but do **not** by themselves establish compliance.

| # | Item | Type | Evidence |
|---|---|---|---|
| C-1 | Determine and document responsible-party / operator roles (school vs platform) | Legal | Counsel memo |
| C-2 | Written operator (DPA) agreement signed with each school before activation | Legal | Signed DPA; `school_agreements` record |
| C-3 | Lawful basis and **guardian authorisation** for processing children's information defined (consent or other ground) and recorded | Legal + product | Counsel memo; consent flow; `consent_records` |
| C-4 | Privacy notice(s) for parents and schools approved and versioned | Legal | `legal_documents` versions |
| C-5 | Information Officer appointed/registered for each responsible party; platform operator's officer designated | Org | Registration records |
| C-6 | Purpose limitation: no use of child data for marketing/analytics beyond service delivery | Policy | Policy doc; code review |
| C-7 | Retention schedule agreed (financial records vs learner PII), anonymisation tested | Legal + tech | Schedule; test evidence |
| C-8 | Data-subject request procedure (access/correction/deletion/objection) with owners and SLAs | Org + tech | Procedure; `data_subject_requests` exercised |
| C-9 | Breach response plan incl. notification to the Information Regulator and affected persons | Org | Plan; tabletop exercise |
| C-10 | Cross-border transfer review of every vendor (hosting, email, monitoring, payment) | Legal | Vendor register with locations/agreements |
| C-11 | Vendor operator agreements (Supabase, Vercel, email, Sentry, payment provider) | Legal | Signed/online terms accepted |
| C-12 | Custody/settlement model approved; payment-system/deposit/consumer-protection analysis done | Legal | Counsel memo |
| C-13 | Terms of service, refund/expiry/unspent-balance policy, provider-fee disclosure | Legal | Published documents |
| C-14 | Tax/accounting treatment of wallet funds vs subscription revenue | Finance | Accountant sign-off |
| C-15 | Security measures documented and appropriate to risk (this document set) + pen-test report | Security | Report |
| C-16 | Staff access policy and training for school admins/cashiers (handling learner data) | Org | Training record |
| C-17 | Complaint/escalation channel for parents | Org | Support page |
| C-18 | No marketing claims of "POPIA compliant" | Product | Copy review |

---

## 7. Security and financial readiness checklist

**Security**
- [ ] RLS matrix suite green on staging; grants audit green.
- [ ] Cross-school, cross-parent and cashier-escalation tests green.
- [ ] No service-role import outside the allow-list; secret scan clean; no secrets in repo history.
- [ ] CSP/security headers verified; CSV injection tests pass.
- [ ] MFA enforced for super-admin and school admins.
- [ ] Rate limits verified under test.
- [ ] Independent penetration test completed; high/critical findings fixed.
- [ ] Dependency audit clean or risk-accepted.
- [ ] Audit log append-only verified; sample audit review done.

**Financial**
- [ ] Ledger invariants/concurrency/idempotency suites green on staging.
- [ ] Webhook abuse suite green (bad signature, replay, wrong amount/currency/reference, duplicates).
- [ ] Sandbox end-to-end top-up credits exactly once.
- [ ] Reconciliation runs clean for N consecutive days on staging data.
- [ ] Refund and reversal flows tested incl. double-click/concurrency.
- [ ] Provider settlement import tested; reports distinguish top-ups/sales/liabilities/settled funds.
- [ ] Failed-payment and pending-recovery cron proven (incl. lost-webhook scenario).
- [ ] Live-payment dry-run plan approved by you (minimum-value real transaction).

---

## 8. NFC hardware readiness

- [ ] Card type and reader models selected and recorded (NFC_INTEGRATION §5 spike results).
- [ ] SDM/DESFire verification validated with real cards and test vectors.
- [ ] Cloned-UID/replayed-tap tests fail as expected.
- [ ] Reader bridge/installer tested on actual POS hardware and OS; recovery from unplug/reboot.
- [ ] Card issuing/encoding process documented, keys handled securely.
- [ ] Simulator disabled in production (env + DB gates verified).
- [ ] Spare cards/readers and replacement procedure for the tuck shop.
- [ ] Latency on the school's real network measured.

---

## 9. UX, accessibility and performance

- [ ] WCAG 2.2 AA review for all four interfaces (keyboard, contrast, focus, labels, reduced motion); POS touch targets ≥ 48 px, high-contrast success/failure states.
- [ ] Parent portal tested on low-end Android devices and slow connections; balance visible within ~2 s on 4G.
- [ ] POS checkout p95 server time target (proposed): < 300 ms DB time, < 1.5 s tap-to-result on school network.
- [ ] Load test: e.g. 20 concurrent POS lanes' worth of checkouts + webhook burst without errors or negative balances.
- [ ] Query plans reviewed for reports; indexes confirmed.
- [ ] Empty/error/loading states present on every screen.

---

## 10. Launch checklist (pilot school)

1. G0–G5 gates satisfied with evidence; you explicitly approve go-live.
2. Production Supabase/Vercel configured per §3; migrations applied; seed script **not** run (or demo school clearly flagged and removed).
3. Pilot school onboarded: school record, DPA signed, administrators with MFA, settings reviewed (limits, top-up range, custody model, provider credentials).
4. Learners imported/created; guardian invitations issued; guardian verification process followed.
5. Products and stock loaded; barcodes verified with the school's scanner.
6. Cards encoded/registered/assigned; replacement stock ready; reader and POS device tested at the actual tuck shop.
7. Cashier accounts created; short training; shift/refund/override procedures explained.
8. Payments: provider live credentials set; webhook URL verified; one minimal real top-up + purchase + refund rehearsed with your approval; `payments_enabled` set by super-admin.
9. Monitoring and alerting verified; support contact and escalation paths communicated to parents.
10. Daily reconciliation owner assigned for the first weeks; first-week hypercare window.

---

## 11. Known limitations (initial release)

- Wallet payments require an **online** connection; no offline authorisation.
- Wallet-only POS: no cash handling.
- Contactless relay attacks cannot be fully eliminated; mitigated by limits, notifications and cashier presence.
- Web NFC works only on Android Chrome; USB readers need a local bridge or dedicated POS app.
- Automatic top-ups depend on provider tokenisation being available and enabled; otherwise unavailable.
- Email and in-app only; SMS/WhatsApp not implemented.
- Single currency (ZAR); single wallet per learner; no sibling transfers.
- Platform-pooled custody is not implemented.
- Legal compliance (POPIA, payments regulation) is **not** established by the software alone.
