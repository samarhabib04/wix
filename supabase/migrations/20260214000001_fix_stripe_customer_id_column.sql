-- Fix stripe_customer_id column in business_subscriptions
-- This ensures the column exists even if previous migrations didn't apply correctly

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
    
    RAISE NOTICE 'Added stripe_customer_id column to business_subscriptions';
  ELSE
    RAISE NOTICE 'stripe_customer_id column already exists in business_subscriptions';
  END IF;
END $$;
