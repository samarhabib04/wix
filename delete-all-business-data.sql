-- Delete all business subscriptions
DELETE FROM business_subscriptions;

-- Delete all business listings (this will also cascade delete related data)
DELETE FROM business_listings;

-- Verify deletion
SELECT 
  COUNT(*) as remaining_subscriptions
FROM business_subscriptions;

SELECT 
  COUNT(*) as remaining_business_listings
FROM business_listings;
