-- Add stripe_customer_id column to business_subscriptions if it doesn't exist
-- Run this in Supabase Dashboard SQL Editor

DO $$ 
BEGIN
  -- Check if column exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'business_subscriptions' 
      AND column_name = 'stripe_customer_id'
  ) THEN
    -- Add the column
    ALTER TABLE public.business_subscriptions 
    ADD COLUMN stripe_customer_id text;
    
    -- Create index for better query performance
    CREATE INDEX IF NOT EXISTS idx_business_subscriptions_stripe_customer_id 
    ON public.business_subscriptions(stripe_customer_id);
    
    RAISE NOTICE '✅ Added stripe_customer_id column to business_subscriptions';
  ELSE
    RAISE NOTICE 'ℹ️ stripe_customer_id column already exists in business_subscriptions';
  END IF;
END $$;

-- Verify the column was added
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'business_subscriptions' 
  AND column_name = 'stripe_customer_id';
