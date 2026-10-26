-- Run manually in the Supabase SQL editor AFTER the user has registered and verified email.
-- Replace the email with the platform operator's account.

-- Example:
-- insert into public.role_assignments (user_id, role, status)
-- select p.id, 'super_admin', 'active'
-- from public.profiles p
-- where p.email = 'you@example.com'
-- on conflict do nothing;
