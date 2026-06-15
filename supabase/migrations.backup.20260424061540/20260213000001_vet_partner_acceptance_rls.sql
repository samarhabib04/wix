-- Vet Partner Acceptance Flow - RLS Policies and Notification Function
-- This migration adds:
-- 1) RLS policies for business owners to update/delete their vet partner status
-- 2) Function to notify business owner when invited as vet partner

-- 1. RLS Policy: Business owners can update their own vet partner status
DROP POLICY IF EXISTS "Business owners can update their own vet partner status" ON public.vet_partners;
CREATE POLICY "Business owners can update their own vet partner status"
  ON public.vet_partners
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.business_listings
      WHERE business_listings.id = vet_partners.business_id
      AND business_listings.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.business_listings
      WHERE business_listings.id = vet_partners.business_id
      AND business_listings.user_id = auth.uid()
    )
  );

-- 2. RLS Policy: Business owners can delete their own vet partner invitation (reject)
DROP POLICY IF EXISTS "Business owners can delete their own vet partner invitation" ON public.vet_partners;
CREATE POLICY "Business owners can delete their own vet partner invitation"
  ON public.vet_partners
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.business_listings
      WHERE business_listings.id = vet_partners.business_id
      AND business_listings.user_id = auth.uid()
    )
  );

-- 3. Function to notify business owner of vet partner invitation
CREATE OR REPLACE FUNCTION public.notify_vet_partner_invitation(
  p_business_id uuid,
  p_invited_by uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  business_owner_id uuid;
  business_name text;
  admin_name text;
BEGIN
  -- Get business owner user_id and business name
  SELECT 
    user_id,
    name
  INTO 
    business_owner_id,
    business_name
  FROM public.business_listings
  WHERE id = p_business_id;

  IF business_owner_id IS NULL THEN
    RAISE EXCEPTION 'Business not found';
  END IF;

  -- Get admin name who invited
  SELECT 
    COALESCE(
      NULLIF(TRIM(
        COALESCE(business_name, '') ||
        CASE WHEN business_name IS NOT NULL AND business_name <> '' THEN ' - ' ELSE '' END ||
        COALESCE(first_name || ' ' || last_name, '')
      ), ''),
      email,
      'Admin'
    )
  INTO admin_name
  FROM public.user_profiles
  WHERE id = p_invited_by;

  IF admin_name IS NULL THEN
    admin_name := 'Admin';
  END IF;

  -- Create notification for business owner
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
  ) VALUES (
    business_owner_id,
    'Vet Partner Invitation',
    COALESCE(
      'You have been invited to become a DogQuest Vet Partner for "' || business_name || '" by ' || admin_name || '. Accept the invitation to get listed in our Vet Directory.',
      'You have been invited to become a DogQuest Vet Partner.'
    ),
    'vet_partner_invitation',
    p_business_id,
    'business',
    false,
    NOW(),
    NOW()
  );
END;
$$;

COMMENT ON FUNCTION public.notify_vet_partner_invitation(uuid, uuid)
IS 'Creates a notification for the business owner when they are invited to become a vet partner';
