-- Directory and public profile pages query public_user_profiles, which is a view on
-- user_profiles. RLS on user_profiles only allows non-admins to read their own row,
-- so sellers/buyers only saw themselves. Expose directory-safe fields via SECURITY
-- DEFINER RPCs (same pattern as get_public_user_name).

DROP FUNCTION IF EXISTS public.list_public_user_directory(integer, integer, text, text, text);
DROP FUNCTION IF EXISTS public.get_public_directory_user_profile(uuid);

CREATE OR REPLACE FUNCTION public.list_public_user_directory(
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 8,
  p_search text DEFAULT NULL,
  p_role text DEFAULT NULL,
  p_county text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit integer;
  v_offset integer;
  v_total bigint;
  v_users jsonb;
  v_search text := NULLIF(trim(COALESCE(p_search, '')), '');
  v_role text := NULLIF(lower(trim(COALESCE(p_role, ''))), '');
  v_county text := NULLIF(trim(COALESCE(p_county, '')), '');
BEGIN
  v_limit := LEAST(GREATEST(COALESCE(NULLIF(p_page_size, 0), 8), 1), 100);
  v_offset := GREATEST(0, (GREATEST(COALESCE(NULLIF(p_page, 0), 1), 1) - 1) * v_limit);

  WITH base AS (
    SELECT
      up.id,
      up.first_name,
      up.last_name,
      up.role,
      up.county,
      up.business_name,
      up.created_at,
      up.avatar_url,
      up.is_admin
    FROM public.user_profiles up
    WHERE up.role = ANY (ARRAY['buyer'::text, 'seller'::text, 'business'::text])
      AND (
        v_search IS NULL
        OR up.first_name ILIKE '%' || v_search || '%'
        OR up.last_name ILIKE '%' || v_search || '%'
        OR up.county ILIKE '%' || v_search || '%'
        OR up.role ILIKE '%' || v_search || '%'
      )
      AND (v_role IS NULL OR up.role = v_role)
      AND (v_county IS NULL OR up.county = v_county)
  ),
  counted AS (
    SELECT COUNT(*)::bigint AS cnt FROM base
  ),
  paged AS (
    SELECT b.*
    FROM base b
    ORDER BY b.created_at DESC NULLS LAST
    LIMIT v_limit OFFSET v_offset
  )
  SELECT counted.cnt, COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'first_name', p.first_name,
          'last_name', p.last_name,
          'role', p.role,
          'county', p.county,
          'business_name', p.business_name,
          'created_at', p.created_at,
          'avatar_url', p.avatar_url,
          'is_admin', p.is_admin
        )
        ORDER BY p.created_at DESC NULLS LAST
      )
      FROM paged p
    ),
    '[]'::jsonb
  )
  INTO v_total, v_users
  FROM counted;

  RETURN jsonb_build_object(
    'users', COALESCE(v_users, '[]'::jsonb),
    'total_count', COALESCE(v_total, 0)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_directory_user_profile(p_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT to_jsonb(s)
  FROM (
    SELECT
      up.id,
      up.first_name,
      up.last_name,
      up.role,
      up.county,
      up.business_name,
      up.created_at,
      up.avatar_url
    FROM public.user_profiles up
    WHERE up.id = p_user_id
      AND up.role = ANY (ARRAY['buyer'::text, 'seller'::text, 'business'::text])
  ) s;
$$;

REVOKE ALL ON FUNCTION public.list_public_user_directory(integer, integer, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_public_user_directory(integer, integer, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.list_public_user_directory(integer, integer, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_public_user_directory(integer, integer, text, text, text) TO service_role;

REVOKE ALL ON FUNCTION public.get_public_directory_user_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_directory_user_profile(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_directory_user_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_directory_user_profile(uuid) TO service_role;
