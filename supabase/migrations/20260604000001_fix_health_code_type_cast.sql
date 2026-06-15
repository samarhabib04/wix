-- Fix health_code_type enum comparisons in reuse-lock functions

CREATE OR REPLACE FUNCTION public.check_health_code_available(
  p_code text,
  p_code_type text,
  p_exclude_listing_id uuid DEFAULT NULL,
  p_exclude_listing_type text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text := UPPER(TRIM(p_code));
  v_existing record;
BEGIN
  IF v_code IS NULL OR v_code = '' THEN
    RETURN true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.health_codes hc
    WHERE hc.code = v_code
      AND hc.code_type = p_code_type::public.health_code_type
      AND hc.is_active = true
  ) THEN
    RETURN false;
  END IF;

  SELECT u.listing_id, u.listing_type
  INTO v_existing
  FROM public.health_code_usages u
  WHERE u.code = v_code;

  IF NOT FOUND THEN
    RETURN true;
  END IF;

  IF p_exclude_listing_id IS NOT NULL
     AND v_existing.listing_id = p_exclude_listing_id
     AND v_existing.listing_type = p_exclude_listing_type THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_health_code_locks_for_listing(
  p_listing_id uuid,
  p_listing_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row record;
  v_owner record;
BEGIN
  DELETE FROM public.health_code_usages u
  WHERE u.listing_id = p_listing_id
    AND u.listing_type = p_listing_type
    AND NOT EXISTS (
      SELECT 1
      FROM public.extract_listing_health_codes(p_listing_id, p_listing_type) c
      WHERE c.code = u.code
    );

  FOR v_row IN
    SELECT c.code, c.code_type
    FROM public.extract_listing_health_codes(p_listing_id, p_listing_type) c
    INNER JOIN public.health_codes hc
      ON hc.code = c.code
      AND hc.code_type = c.code_type::public.health_code_type
      AND hc.is_active = true
  LOOP
    SELECT listing_id, listing_type INTO v_owner
    FROM public.health_code_usages
    WHERE code = v_row.code;

    IF FOUND THEN
      IF v_owner.listing_id = p_listing_id AND v_owner.listing_type = p_listing_type THEN
        UPDATE public.health_code_usages
        SET code_type = v_row.code_type, locked_at = NOW()
        WHERE code = v_row.code;
      ELSE
        RAISE EXCEPTION 'Health code % is already used on another listing', v_row.code
          USING ERRCODE = 'unique_violation';
      END IF;
    ELSE
      INSERT INTO public.health_code_usages (code, code_type, listing_id, listing_type)
      VALUES (v_row.code, v_row.code_type, p_listing_id, p_listing_type);
    END IF;
  END LOOP;
END;
$$;

-- Re-run backfill after fix
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT id FROM public.sale_listings
    WHERE admin_approved = true
      AND is_published = true
      AND COALESCE(is_deleted, false) = false
  LOOP
    BEGIN
      PERFORM public.sync_health_code_locks_for_listing(r.id, 'sale');
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not lock sale listing %: %', r.id, SQLERRM;
    END;
  END LOOP;

  FOR r IN
    SELECT id FROM public.stud_listings
    WHERE admin_approved = true
      AND is_published = true
      AND COALESCE(is_deleted, false) = false
  LOOP
    BEGIN
      PERFORM public.sync_health_code_locks_for_listing(r.id, 'stud');
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not lock stud listing %: %', r.id, SQLERRM;
    END;
  END LOOP;
END;
$$;
