-- Reset business1@dogquest.com for Elite + Stripe Connect re-testing.
-- Run: supabase db query --linked --agent=no -f supabase/scripts/reset-business1-test-account.sql

BEGIN;

-- 1) Clear Stripe Connect on profile
UPDATE public.user_profiles
SET
  stripe_account_id = NULL,
  stripe_onboarding_completed = false,
  payout_enabled = false,
  stripe_charges_enabled = false
WHERE email = 'business1@dogquest.com';

-- 2) Remove active Elite subscription so user can subscribe again
DELETE FROM public.business_subscriptions
WHERE user_id = (SELECT id FROM public.user_profiles WHERE email = 'business1@dogquest.com')
  AND subscription_tier = 'elite_marketplace'
  AND status = 'active';

-- 3) Legacy subscribers fallback — revert to premium (pre-elite test state)
UPDATE public.subscribers
SET
  subscription_tier = 'premium',
  subscribed = true
WHERE user_id = (SELECT id FROM public.user_profiles WHERE email = 'business1@dogquest.com');

COMMIT;

-- Verify
SELECT up.email, up.stripe_account_id, up.stripe_onboarding_completed, up.payout_enabled, up.stripe_charges_enabled
FROM public.user_profiles up
WHERE up.email = 'business1@dogquest.com';

SELECT bs.subscription_tier, bs.status, bs.end_date
FROM public.business_subscriptions bs
JOIN public.user_profiles up ON up.id = bs.user_id
WHERE up.email = 'business1@dogquest.com'
ORDER BY bs.created_at DESC;

SELECT s.subscription_tier, s.subscribed
FROM public.subscribers s
JOIN public.user_profiles up ON up.id = s.user_id
WHERE up.email = 'business1@dogquest.com';
