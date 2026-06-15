-- Buyers cannot SELECT other users' user_profiles (RLS). Listing page needs to know if the
-- seller can accept reservation payments without exposing profile rows. This mirrors
-- lib/utils/stripe-connect.ts and create-reservation-payment edge logic.

CREATE OR REPLACE FUNCTION public.is_seller_stripe_ready_for_reservations(p_seller_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.id = p_seller_id
      AND up.stripe_account_id IS NOT NULL
      AND COALESCE(up.stripe_onboarding_completed, false) = true
      AND (
        COALESCE(up.payout_enabled, false) = true
        OR COALESCE(up.stripe_charges_enabled, false) = true
      )
  );
$$;

COMMENT ON FUNCTION public.is_seller_stripe_ready_for_reservations(uuid) IS
  'Public-safe: returns whether seller can take Connect charges for reservations (buyer UI + RLS-safe).';

REVOKE ALL ON FUNCTION public.is_seller_stripe_ready_for_reservations(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_seller_stripe_ready_for_reservations(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_seller_stripe_ready_for_reservations(uuid) TO authenticated;
