-- Ad edit approval: align sale_listing_edits + admin notifications for pending edits

ALTER TABLE public.sale_listing_edits
  ADD COLUMN IF NOT EXISTS energy text,
  ADD COLUMN IF NOT EXISTS size text,
  ADD COLUMN IF NOT EXISTS documents jsonb;

COMMENT ON COLUMN public.sale_listing_edits.energy IS 'Matches sale_listings.energy for pending edit review';
COMMENT ON COLUMN public.sale_listing_edits.size IS 'Matches sale_listings.size for pending edit review';
COMMENT ON COLUMN public.sale_listing_edits.documents IS 'Supporting documents submitted with the edit';

-- Notify admins when a seller submits edits to a live listing
CREATE OR REPLACE FUNCTION public.notify_admins_listing_edit_pending(
  p_listing_id uuid,
  p_listing_type text,
  p_title text,
  p_seller_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_users uuid[];
  seller_name text;
  notification_type text;
BEGIN
  SELECT array_agg(id) INTO admin_users
  FROM public.user_profiles
  WHERE role = 'admin' OR is_admin = true;

  IF admin_users IS NULL OR array_length(admin_users, 1) IS NULL THEN
    RETURN;
  END IF;

  SELECT
    COALESCE(
      NULLIF(TRIM(
        COALESCE(business_name, '') ||
        CASE WHEN business_name IS NOT NULL AND business_name <> '' THEN ' - ' ELSE '' END ||
        COALESCE(first_name || ' ' || last_name, '')
      ), ''),
      email,
      'Unknown seller'
    )
  INTO seller_name
  FROM public.user_profiles
  WHERE id = p_seller_id;

  IF seller_name IS NULL THEN
    seller_name := 'Unknown seller';
  END IF;

  notification_type := CASE lower(p_listing_type)
    WHEN 'sale' THEN 'listing_edit_pending'
    WHEN 'stud' THEN 'stud_edit_pending'
    WHEN 'showcase' THEN 'showcase_edit_pending'
    ELSE 'listing_edit_pending'
  END;

  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    listing_id,
    listing_type,
    read,
    created_at,
    updated_at
  )
  SELECT
    admin_id,
    CASE lower(p_listing_type)
      WHEN 'sale' THEN 'Listing edit awaiting review'
      WHEN 'stud' THEN 'Stud listing edit awaiting review'
      WHEN 'showcase' THEN 'Showcase edit awaiting review'
      ELSE 'Listing edit awaiting review'
    END,
    'Edit submitted for "' || COALESCE(p_title, 'Untitled') || '" by ' || seller_name ||
      '. The current version remains live until you approve the changes.',
    notification_type,
    p_listing_id,
    p_listing_type,
    false,
    NOW(),
    NOW()
  FROM unnest(admin_users) AS admin_id;
END;
$$;

COMMENT ON FUNCTION public.notify_admins_listing_edit_pending(uuid, text, text, uuid)
IS 'Notifies all admins when a seller submits edits to a published listing';
