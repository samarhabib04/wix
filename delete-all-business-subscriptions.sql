-- Delete all business subscriptions
DELETE FROM business_subscriptions;

-- Reset subscription fields in business_listings
UPDATE business_listings
SET 
  subscription_tier = NULL,
  subscription_billing_period = NULL,
  stripe_subscription_id = NULL,
  updated_at = NOW()
WHERE subscription_tier IS NOT NULL;

-- Verify deletion
SELECT 
  COUNT(*) as remaining_subscriptions
FROM business_subscriptions;

SELECT 
  COUNT(*) as businesses_with_subscription_tier
FROM business_listings
WHERE subscription_tier IS NOT NULL;
