-- Public display names for any user id (bypasses user_profiles RLS for anon visitors).
-- Used by stud/listing pages and messaging. Safe fields only.

-- Avoid ambiguous overloads if an older uuid signature existed.
DROP FUNCTION IF EXISTS public.get_public_user_name(uuid);

CREATE OR REPLACE FUNCTION public.get_public_user_name(user_id_param text)
RETURNS TABLE (
  avatar_url text,
  business_name text,
  first_name text,
  last_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    up.avatar_url::text,
    up.business_name::text,
    up.first_name::text,
    up.last_name::text
  FROM public.user_profiles up
  WHERE up.id = user_id_param::uuid;
$$;

REVOKE ALL ON FUNCTION public.get_public_user_name(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_user_name(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_user_name(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_user_name(text) TO service_role;
