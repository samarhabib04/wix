-- Align RPC with lib/utils/stripe-connect.ts: ready when Connect can charge,
-- not when onboarding flag is stuck due to Stripe currently_due items.

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
