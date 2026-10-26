# Pilot walkthrough — one parent, one child, one card

Use this with your **hosted dev** Supabase project and a local `npm run dev`.

## 0. One-time setup

1. **Supabase Auth** → Site URL `http://localhost:3000`, redirect `http://localhost:3000/auth/callback`
2. **Register** at `/register` and verify email (you = parent).
3. **Super admin** (SQL Editor), use your sign-up email:

```sql
insert into public.role_assignments (user_id, role, status)
select p.id, 'super_admin', 'active'
from public.profiles p
join auth.users u on u.id = p.id
where u.email = 'YOUR_EMAIL'
on conflict do nothing;
```

Sign out and sign in. **MFA is skipped in local `APP_ENV=development`**; staging/production still require an authenticator app for school/platform admins.

## 1. Create the school (platform admin)

1. Open **/admin/schools** (choose **Platform admin** context if asked).
2. **Onboard pilot school** — use your email as **School admin email** (same account as parent is fine).
3. School is created and **activated** automatically.

## 2. School admin — learner & parent link

1. **/select-context** → pick **School admin · …**
2. **School → Learners** → add one child manually **or** download the CSV template, fill in `guardian_email`, and import (Excel: save as CSV UTF-8).
3. Open each **invite link** (shown after import/add) while signed in as that caregiver email.
4. Copy the **invite URL** (shown once) and open it while signed in as parent, or paste in the same browser.
5. **Accept invitation** → link should be **active** immediately (email-locked invite).

## 3. Parent view

1. Switch context to **Parent** (`/select-context`).
2. **Children**, **Dashboard**, and **Wallet** — you should see the learner and balance (R0.00 until the school adds funds).

## 3b. Pilot wallet credit (school admin)

Balances change only through audited ledger functions (not manual SQL).

1. As **school admin**, open **School → Learners**.
2. On the learner row, use **Add funds** (e.g. R50) with a short reason.
3. As **parent**, refresh **Wallet** / **Dashboard** — balance should match.
4. **School → Transactions** — reconciliation should show **Balanced**.

## 3c. Products (school admin)

1. **School → Products** — categories are seeded automatically (Food, Snacks, Drinks, Stationery, Other).
2. Add items manually or import CSV; set prices in rand, optional barcodes, and **Track stock** for inventory.
3. **School → Inventory** — restock, adjust, or write off stock; movement history should match on-hand quantities.
4. Optional: create a public **`product-images`** storage bucket in Supabase for photo uploads on edit.

## 3d. POS sale (school admin or cashier)

1. Select **Tuck Shop POS** context (school admins can sell; dedicated cashier role optional).
2. **Shift** → name this device → **Open shift**.
3. **Sell** → add products → **Checkout** → paste Parth’s card UID (`uid:…` from School → NFC cards) → confirm.
4. **Parent** wallet and **POS → Transactions** should show the sale.

## 3e. Refund (POS)

1. **POS → Refunds** → pick a recent receipt → choose quantities → enter a reason → **Submit refund**.
2. Refunds **up to R50** credit the wallet immediately; larger amounts show under **Pending approval** for a **school admin** on the same page.
3. **Parent → Wallet** should increase by the refunded amount.

## 4. Blank NFC card (pilot UID only)

Real tap-to-pay is **Phase 7–8**. For now we only **store the card UID** in the database.

1. As **school admin**, open **School → NFC cards**.
2. Click **Enable pilot UID cards**.
3. Read the blank card’s UID with an NFC tool app (e.g. “NFC Tools” on a phone) and paste it into **Register card UID**.
4. Card appears in the list as `uid:…`.

**Do not** treat UID-only cards as secure — they are for wiring tests only.

## 5. What’s not in this pilot yet

- Online parent top-up / PayFast (Phase 9)
- **POS Sell:** simulated tap panel or keyboard-wedge UID in dev; checkout calls `pos_validate_credential_for_checkout` before preview/confirm.
- **School → NFC cards:** freeze, lost/stolen, replace UID (pilot mode).
- Still pending for production: NTAG 424 SDM taps, hardware spike sign-off (`docs/HARDWARE_SPIKE.md`).

## Troubleshooting

| Issue | Fix |
|--------|-----|
| Can’t open `/admin` | Grant `super_admin` SQL above; complete MFA |
| Can’t open `/school` | Onboard school with your email as school admin; select school context |
| Invite fails | Parent email must match login email exactly |
| Card register fails | Enable pilot UID first; school must be **active** |
