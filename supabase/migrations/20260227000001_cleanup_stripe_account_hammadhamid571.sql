-- Clean up Stripe account data for user with email hammadhamid571@gmail.com
-- This user's Stripe account was closed/deleted, so we need to clear the payment setup data

UPDATE public.user_profiles
SET 
  stripe_account_id = NULL,
  stripe_onboarding_completed = false,
  payout_enabled = false
WHERE email = 'hammadhamid571@gmail.com';

-- Verify the update (optional - can be removed after verification)
-- SELECT id, email, stripe_account_id, stripe_onboarding_completed, payout_enabled 
-- FROM public.user_profiles 
-- WHERE email = 'hammadhamid571@gmail.com';
