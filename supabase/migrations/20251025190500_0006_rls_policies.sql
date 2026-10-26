-- 0006: row level security (default deny; explicit policies only)

alter table public.profiles enable row level security;
alter table public.profiles force row level security;
alter table public.platform_settings enable row level security;
alter table public.platform_settings force row level security;
alter table public.subscription_plans enable row level security;
alter table public.subscription_plans force row level security;
alter table public.schools enable row level security;
alter table public.schools force row level security;
alter table public.school_settings enable row level security;
alter table public.school_settings force row level security;
alter table public.role_assignments enable row level security;
alter table public.role_assignments force row level security;
alter table public.staff_invitations enable row level security;
alter table public.staff_invitations force row level security;
alter table public.audit_logs enable row level security;
alter table public.audit_logs force row level security;
alter table public.learners enable row level security;
alter table public.learners force row level security;
alter table public.parent_invitations enable row level security;
alter table public.parent_invitations force row level security;
alter table public.parent_learner_relationships enable row level security;
alter table public.parent_learner_relationships force row level security;
alter table public.product_categories enable row level security;
alter table public.product_categories force row level security;
alter table public.products enable row level security;
alter table public.products force row level security;
alter table public.nfc_cards enable row level security;
alter table public.nfc_cards force row level security;
alter table public.notifications enable row level security;
alter table public.notifications force row level security;
alter table public.notification_preferences enable row level security;
alter table public.notification_preferences force row level security;
alter table public.ledger_accounts enable row level security;
alter table public.ledger_accounts force row level security;
alter table public.wallets enable row level security;
alter table public.wallets force row level security;
alter table public.ledger_transactions enable row level security;
alter table public.ledger_transactions force row level security;
alter table public.ledger_entries enable row level security;
alter table public.ledger_entries force row level security;
alter table public.wallet_top_ups enable row level security;
alter table public.wallet_top_ups force row level security;
alter table public.purchases enable row level security;
alter table public.purchases force row level security;
alter table public.purchase_items enable row level security;
alter table public.purchase_items force row level security;

-- profiles
create policy profiles_select_own on public.profiles
for select to authenticated
using (id = auth.uid() or private.is_super_admin());

create policy profiles_update_own on public.profiles
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- role_assignments: users read their own rows
create policy role_assignments_select_own on public.role_assignments
for select to authenticated
using (user_id = auth.uid() or private.is_super_admin());

-- schools
create policy schools_select_staff on public.schools
for select to authenticated
using (private.is_school_staff(id) or private.is_super_admin());

create policy schools_select_guardian on public.schools
for select to authenticated
using (
  exists (
    select 1
    from public.parent_learner_relationships plr
    join public.learners l on l.id = plr.learner_id
    where plr.parent_id = auth.uid()
      and plr.status = 'active'
      and l.school_id = schools.id
  )
);

create policy schools_all_super_admin on public.schools
for all to authenticated
using (private.is_super_admin())
with check (private.is_super_admin());

-- school_settings: school admins read
create policy school_settings_select_staff on public.school_settings
for select to authenticated
using (private.is_school_admin(school_id) or private.is_super_admin());

-- learners
create policy learners_select_guardian on public.learners
for select to authenticated
using (private.is_guardian_of_learner(id));

create policy learners_select_staff on public.learners
for select to authenticated
using (private.is_school_staff(school_id) or private.is_school_admin(school_id));

-- parent relationships
create policy plr_select_own on public.parent_learner_relationships
for select to authenticated
using (parent_id = auth.uid() or private.is_school_admin(school_id));

-- wallets (guardians + school staff read)
create policy wallets_select_guardian on public.wallets
for select to authenticated
using (private.is_guardian_of_learner(learner_id));

create policy wallets_select_staff on public.wallets
for select to authenticated
using (private.is_school_staff(school_id) or private.is_school_admin(school_id));

-- products (cashier read active catalogue)
create policy products_select_staff on public.products
for select to authenticated
using (
  is_active
  and archived_at is null
  and (private.is_school_staff(school_id) or private.is_school_admin(school_id))
);

create policy product_categories_select_staff on public.product_categories
for select to authenticated
using (private.is_school_staff(school_id) or private.is_school_admin(school_id));

-- purchases
create policy purchases_select_guardian on public.purchases
for select to authenticated
using (private.is_guardian_of_learner(learner_id));

create policy purchases_select_cashier on public.purchases
for select to authenticated
using (cashier_id = auth.uid());

create policy purchases_select_staff on public.purchases
for select to authenticated
using (private.is_school_admin(school_id));

-- wallet top-ups (payer)
create policy topups_select_parent on public.wallet_top_ups
for select to authenticated
using (parent_id = auth.uid() or private.is_school_admin(school_id));

-- notifications
create policy notifications_own on public.notifications
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy notification_prefs_own on public.notification_preferences
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- ledger: school admin read only (no writes via API)
create policy ledger_tx_select_admin on public.ledger_transactions
for select to authenticated
using (private.is_school_admin(school_id) or private.is_super_admin());

create policy ledger_entries_select_admin on public.ledger_entries
for select to authenticated
using (private.is_school_admin(school_id) or private.is_super_admin());

create policy ledger_accounts_select_admin on public.ledger_accounts
for select to authenticated
using (school_id is null or private.is_school_admin(school_id) or private.is_super_admin());

-- nfc cards
create policy nfc_cards_select_guardian on public.nfc_cards
for select to authenticated
using (
  learner_id is not null
  and private.is_guardian_of_learner(learner_id)
);

create policy nfc_cards_select_staff on public.nfc_cards
for select to authenticated
using (private.is_school_admin(school_id));

-- platform / subscriptions read for super admin
create policy platform_settings_super on public.platform_settings
for select to authenticated
using (private.is_super_admin());

create policy subscription_plans_read on public.subscription_plans
for select to authenticated
using (private.is_super_admin());

-- audit logs: school admin sees own school
create policy audit_logs_school_admin on public.audit_logs
for select to authenticated
using (private.is_school_admin(school_id) or private.is_super_admin());

-- staff invitations: school admin
create policy staff_invites_school_admin on public.staff_invitations
for select to authenticated
using (private.is_school_admin(school_id));

-- purchase items follow purchase visibility (simplified: school admin + guardian via join in app; policy on school)
create policy purchase_items_select_staff on public.purchase_items
for select to authenticated
using (private.is_school_admin(school_id));
