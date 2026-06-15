-- Add stripe_customer_id column to business_subscriptions if it doesn't exist
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'business_subscriptions') THEN
    -- Add stripe_customer_id column if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'business_subscriptions' 
      AND column_name = 'stripe_customer_id'
    ) THEN
      ALTER TABLE public.business_subscriptions 
      ADD COLUMN stripe_customer_id text;
      
      -- Create index for faster lookups
      CREATE INDEX IF NOT EXISTS idx_business_subscriptions_stripe_customer_id 
      ON public.business_subscriptions(stripe_customer_id);
      
      RAISE NOTICE 'Added stripe_customer_id column to business_subscriptions';
    ELSE
      RAISE NOTICE 'stripe_customer_id column already exists in business_subscriptions';
    END IF;
  END IF;
END $$;
