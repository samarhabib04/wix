-- Fix missing columns in business_subscriptions table
-- This migration ensures all required columns exist

-- Add auto_renew column if missing
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'business_subscriptions') THEN
    -- Add auto_renew column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'business_subscriptions' AND column_name = 'auto_renew') THEN
      ALTER TABLE public.business_subscriptions ADD COLUMN auto_renew boolean NOT NULL DEFAULT true;
    END IF;
    
    -- Add user_id column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'business_subscriptions' AND column_name = 'user_id') THEN
      ALTER TABLE public.business_subscriptions ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
      -- Update existing rows to set user_id from business_listings
      UPDATE public.business_subscriptions bs
      SET user_id = bl.user_id
      FROM public.business_listings bl
      WHERE bs.business_id = bl.id AND bs.user_id IS NULL;
      -- Now make it NOT NULL
      ALTER TABLE public.business_subscriptions ALTER COLUMN user_id SET NOT NULL;
    END IF;
    
    -- Add amount_paid column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'business_subscriptions' AND column_name = 'amount_paid') THEN
      ALTER TABLE public.business_subscriptions ADD COLUMN amount_paid decimal(10, 2) NOT NULL DEFAULT 0;
    END IF;
    
    -- Ensure start_date has default
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'business_subscriptions' AND column_name = 'start_date') THEN
      ALTER TABLE public.business_subscriptions ALTER COLUMN start_date SET DEFAULT now();
    END IF;
  END IF;
END $$;
