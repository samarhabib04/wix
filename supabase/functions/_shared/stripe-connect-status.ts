/**
 * Stripe Connect status helpers for edge functions.
 * Keep in sync with lib/utils/stripe-connect.ts.
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

export function deriveStripeConnectStatus(
  account: StripeConnectAccountLike,
): StripeConnectDerivedStatus {
  const chargesEnabled = account.charges_enabled === true;
  const payoutEnabled = account.payouts_enabled === true;
  const detailsSubmitted = account.details_submitted === true;
  const pendingRequirements = account.requirements?.currently_due ?? [];
  const pastDue = (account.requirements?.past_due?.length ?? 0) > 0;
  const disabledReason = account.requirements?.disabled_reason ?? null;

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

export function isStripeConnectReadyFromProfile(
  profile: {
    stripe_account_id?: string | null;
    payout_enabled?: boolean | null;
    stripe_charges_enabled?: boolean | null;
  } | null | undefined,
): boolean {
  if (!profile?.stripe_account_id) {
    return false;
  }
  return !!(profile.payout_enabled || profile.stripe_charges_enabled);
}

const ALLOWED_RETURN_PATHS = new Set([
  '/my-seller-dashboard',
  '/my-business-dashboard',
  '/my-business-dashboard/marketplace',
]);

export function resolveOnboardingUrls(origin: string, returnPath?: string) {
  const path =
    returnPath && ALLOWED_RETURN_PATHS.has(returnPath)
      ? returnPath
      : '/my-seller-dashboard';

  return {
    return_url: `${origin}${path}?onboarding=complete`,
    refresh_url: `${origin}${path}?onboarding=refresh`,
  };
}
