-- Fix: admin creation/promotion was being downgraded to 'buyer'.
--
-- The guard in enforce_user_profiles_no_self_admin() relied on the legacy GUC
-- `request.jwt.claim.role`, which modern Supabase/PostgREST no longer sets (it now
-- exposes the full JWT as JSON in `request.jwt.claims`). As a result, even the
-- service_role edge function (admin-create-admin) fell through to the downgrade
-- branch, so new admins were inserted as buyers and promotions were reverted.
--
-- This re-implements the service_role detection to read the modern JSON claims,
-- while keeping the legacy GUC as a fallback for older environments. Security is
-- unchanged: anon/authenticated callers are still blocked from self-promotion.

CREATE OR REPLACE FUNCTION public.enforce_user_profiles_no_self_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_jwt_role text;
  v_claims   text;
BEGIN
  -- 1) Legacy per-claim GUC (older PostgREST).
  v_jwt_role := NULLIF(current_setting('request.jwt.claim.role', true), '');

  -- 2) Modern PostgREST: full claims JSON in request.jwt.claims.
  IF v_jwt_role IS NULL THEN
    v_claims := NULLIF(current_setting('request.jwt.claims', true), '');
    IF v_claims IS NOT NULL THEN
      BEGIN
        v_jwt_role := v_claims::jsonb ->> 'role';
      EXCEPTION WHEN others THEN
        v_jwt_role := NULL; -- malformed claims: treat as non-privileged
      END;
    END IF;
  END IF;

  -- Service role (edge functions using the service_role key) may write freely.
  IF COALESCE(v_jwt_role, '') = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Existing admins may write freely.
  IF public.check_user_is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- Everyone else: strip admin escalation.
  IF TG_OP = 'INSERT' THEN
    IF NEW.role = 'admin' THEN
      NEW.role := 'buyer';
    END IF;
    NEW.is_admin := false;
    RETURN NEW;
  END IF;

  IF NEW.role = 'admin' AND COALESCE(OLD.role, '') <> 'admin' THEN
    NEW.role := OLD.role;
  END IF;
  IF COALESCE(NEW.is_admin, false) IS DISTINCT FROM COALESCE(OLD.is_admin, false) THEN
    NEW.is_admin := OLD.is_admin;
  END IF;
  RETURN NEW;
END;
$$;
