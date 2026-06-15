-- =============================================================================
-- One-off: change seller login email + password (auth + identities + user_profiles)
-- Run in: Supabase Dashboard → SQL Editor (postgres role)
--
-- BEFORE YOU RUN:
-- 1) Set new_password in the DECLARE block below (between the quotes). Do NOT add an
--    IF that compares new_password to your real password — that will always error.
-- 2) Confirm the target user id is still: 1c277680-e1c6-4ad0-a11c-c780c97252f8
-- 3) Ensure the NEW email is not already taken:
--    SELECT id, email FROM auth.users WHERE lower(email) = lower('alyhusnaiin@gmail.com');
--    (should return no rows, or only this same id)
--
-- Direct SQL on auth is powerful but bypasses Auth flows; use Admin API in production apps.
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
DECLARE
  target_id uuid := '1c277680-e1c6-4ad0-a11c-c780c97252f8';
  new_email text := 'alyhusnaiin@gmail.com';
  new_password text := 'REPLACE_ME_PASSWORD'; -- edit this line only
  n int;
BEGIN
  IF new_password = 'REPLACE_ME_PASSWORD' THEN
    RAISE EXCEPTION 'Edit new_password in the DECLARE block (still REPLACE_ME_PASSWORD).';
  END IF;

  IF EXISTS (
    SELECT 1 FROM auth.users
    WHERE lower(email) = lower(new_email) AND id <> target_id
  ) THEN
    RAISE EXCEPTION 'Email % is already used by another user', new_email;
  END IF;

  UPDATE auth.users
  SET
    email = new_email,
    encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf', 10)),
    email_change = '',
    email_change_token_new = '',
    email_change_token_current = '',
    email_change_sent_at = NULL,
    email_change_confirm_status = 0,
    updated_at = now()
  WHERE id = target_id;

  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN
    RAISE EXCEPTION 'auth.users: expected 1 row updated, got %', n;
  END IF;

  UPDATE auth.identities
  SET
    identity_data = jsonb_set(
      COALESCE(identity_data::jsonb, '{}'::jsonb),
      '{email}',
      to_jsonb(new_email),
      true
    )
  WHERE user_id = target_id AND provider = 'email';

  GET DIAGNOSTICS n = ROW_COUNT;
  IF n < 1 THEN
    RAISE WARNING 'auth.identities: no email provider row for user % — check auth.identities', target_id;
  END IF;

  UPDATE public.user_profiles
  SET email = new_email
  WHERE id = target_id;

  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN
    RAISE WARNING 'user_profiles: expected 1 row updated, got % — check if profile exists', n;
  END IF;
END $$;

COMMIT;

-- Verify (optional)
-- SELECT id, email, email_confirmed_at FROM auth.users WHERE id = '1c277680-e1c6-4ad0-a11c-c780c97252f8';
-- SELECT user_id, provider, identity_data FROM auth.identities WHERE user_id = '1c277680-e1c6-4ad0-a11c-c780c97252f8';
-- SELECT id, email, role FROM public.user_profiles WHERE id = '1c277680-e1c6-4ad0-a11c-c780c97252f8';
