-- get_public_user_name: always return exactly one row.
-- If public.user_profiles has no row, fall back to auth.users.raw_user_meta_data (OAuth / email names).

CREATE OR REPLACE FUNCTION public.get_public_user_name(user_id_param text)
RETURNS TABLE (
  avatar_url text,
  business_name text,
  first_name text,
  last_name text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  uid uuid;
BEGIN
  BEGIN
    uid := trim(user_id_param)::uuid;
  EXCEPTION
    WHEN invalid_text_representation THEN
      RETURN QUERY SELECT NULL::text, NULL::text, NULL::text, NULL::text;
      RETURN;
  END;

  RETURN QUERY
  SELECT
    up.avatar_url::text,
    up.business_name::text,
    COALESCE(
      NULLIF(trim(up.first_name), ''),
      NULLIF(trim(au.raw_user_meta_data->>'first_name'), ''),
      NULLIF(trim(au.raw_user_meta_data->>'given_name'), '')
    )::text,
    COALESCE(
      NULLIF(trim(up.last_name), ''),
      NULLIF(trim(au.raw_user_meta_data->>'last_name'), ''),
      NULLIF(trim(au.raw_user_meta_data->>'family_name'), '')
    )::text
  FROM (SELECT uid AS id) x
  LEFT JOIN public.user_profiles up ON up.id = x.id
  LEFT JOIN auth.users au ON au.id = x.id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_user_name(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_user_name(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_user_name(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_user_name(text) TO service_role;
