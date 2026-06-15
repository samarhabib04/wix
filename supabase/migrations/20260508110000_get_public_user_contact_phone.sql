-- Public seller contact helper for listing detail pages.
-- Exposes only phone and only when phone is verified.
DROP FUNCTION IF EXISTS public.get_public_user_contact(text);

CREATE FUNCTION public.get_public_user_contact(user_id_param text)
RETURNS TABLE (
  phone text
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
      RETURN QUERY SELECT NULL::text;
      RETURN;
  END;

  RETURN QUERY
  SELECT
    CASE
      WHEN COALESCE(up.phone_verified, false) = true AND NULLIF(trim(up.phone), '') IS NOT NULL
        THEN trim(up.phone)::text
      ELSE NULL::text
    END AS phone
  FROM (SELECT uid AS id) x
  LEFT JOIN public.user_profiles up ON up.id = x.id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_user_contact(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_user_contact(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_user_contact(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_user_contact(text) TO service_role;
