/**
 * Stripe Connect readiness for marketplace / reservations.
 * Payouts can still be pending while charges are enabled; both allow taking payment.
 *
 * Buyers cannot read sellers' `user_profiles` under RLS — on listing pages use
 * `is_seller_stripe_ready_for_reservations` RPC instead (same rules, boolean only).
 */

export type StripeConnectAccountLike = {
  details_submitted?: boolean | null;
  charges_enabled?: boolean | null;
  payouts_enabled?: boolean | null;
  requirements?: {
    currently_due?: string[] | null;
    past_due?: string[] | null;
    disabled_reason?: string | null;
  } | null;
};

export type StripeConnectDerivedStatus = {
  onboardingCompleted: boolean;
  payoutEnabled: boolean;
  chargesEnabled: boolean;
  connectReadyForPayments: boolean;
  pendingRequirements: string[];
};

/** Derive Connect flags from a Stripe Account object or check_status payload. */
export function deriveStripeConnectStatus(
  account: StripeConnectAccountLike,
): StripeConnectDerivedStatus {
  const chargesEnabled = account.charges_enabled === true;
  const payoutEnabled = account.payouts_enabled === true;
  const detailsSubmitted = account.details_submitted === true;
  const pendingRequirements = account.requirements?.currently_due ?? [];
  const pastDue = (account.requirements?.past_due?.length ?? 0) > 0;
  const disabledReason = account.requirements?.disabled_reason ?? null;

  // Stripe may keep items in currently_due after charges are enabled; do not block
  // sellers who can already accept payments.
  const onboardingCompleted =
    chargesEnabled ||
    payoutEnabled ||
    (detailsSubmitted && !pastDue && !disabledReason);

  const connectReadyForPayments = chargesEnabled || payoutEnabled;

  return {
    onboardingCompleted,
    payoutEnabled,
    chargesEnabled,
    connectReadyForPayments,
    pendingRequirements,
  };
}

export function isStripeConnectReadyForPayments(
  profile: {
    stripe_account_id?: string | null;
    stripe_onboarding_completed?: boolean | null;
    payout_enabled?: boolean | null;
    stripe_charges_enabled?: boolean | null;
  } | null | undefined,
): boolean {
  if (!profile?.stripe_account_id) {
    return false;
  }
  return !!(profile.payout_enabled || profile.stripe_charges_enabled);
}

export function isStripeConnectReadyFromCheckStatus(
  data: {
    status?: string;
    connect_ready_for_payments?: boolean;
    payout_enabled?: boolean;
    charges_enabled?: boolean;
  } | null | undefined,
): boolean {
  if (data?.connect_ready_for_payments != null) {
    return data.connect_ready_for_payments;
  }
  return (
    data?.status === 'exists' &&
    !!(data.payout_enabled || data.charges_enabled)
  );
}

/** Allowed return paths for Stripe Connect onboarding (must match edge function allowlist). */
export const STRIPE_CONNECT_RETURN_PATHS = {
  seller: '/my-seller-dashboard',
  business: '/my-business-dashboard',
  marketplace: '/my-business-dashboard/marketplace',
} as const;
