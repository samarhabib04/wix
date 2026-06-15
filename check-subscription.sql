-- Check if subscription record exists for business_id: 6fc4a891-4a1b-48c3-9b20-1cd5c437d0e3
SELECT 
  id,
  business_id,
  user_id,
  subscription_tier,
  billing_period,
  status,
  stripe_subscription_id,
  stripe_price_id,
  amount_paid,
  start_date,
  end_date,
  created_at,
  updated_at
FROM business_subscriptions
WHERE business_id = '6fc4a891-4a1b-48c3-9b20-1cd5c437d0e3'
ORDER BY created_at DESC;

-- Also check business_listings to see if subscription_tier is set
SELECT 
  id,
  name,
  user_id,
  subscription_tier,
  created_at
FROM business_listings
WHERE id = '6fc4a891-4a1b-48c3-9b20-1cd5c437d0e3';
