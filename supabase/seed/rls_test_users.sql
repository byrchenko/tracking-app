-- Fixture accounts for the cross-user RLS tests.
--
-- Run once per environment, in the Supabase SQL Editor, replacing the password
-- placeholder with the value you put in RLS_TEST_PASSWORD. These accounts exist
-- only in dev projects and own no real data.
--
-- Why fixed accounts rather than created per test run: deleting auth.users
-- requires service_role privileges, which the test suite deliberately does not
-- have (a test that can bypass RLS proves nothing about RLS). Fixed accounts let
-- the tests clean up their own data rows through normal RLS-governed deletes.
--
-- See docs/decisions/0003-rls-tests-against-remote.md.

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  -- GoTrue reads these into non-nullable Go strings. Leaving them NULL — the
  -- default for a hand-written insert — makes sign-in fail at runtime with
  -- "Database error querying schema", which is a genuinely confusing error to
  -- debug from the client side.
  confirmation_token, recovery_token, email_change, email_change_token_new,
  email_change_token_current, phone_change, phone_change_token,
  reauthentication_token
)
values
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated',
   'authenticated', 'rls-test-a@example.com',
   crypt('REPLACE_WITH_RLS_TEST_PASSWORD', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"full_name":"RLS Test A"}'::jsonb,
   '', '', '', '', '', '', '', ''),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated',
   'authenticated', 'rls-test-b@example.com',
   crypt('REPLACE_WITH_RLS_TEST_PASSWORD', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"full_name":"RLS Test B"}'::jsonb,
   '', '', '', '', '', '', '', '')
on conflict (id) do nothing;
