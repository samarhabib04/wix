-- Business Subscriptions Table
-- Supports Standard (€8/month or €80/year), Premium (€12/month or €120/year), and Elite Marketplace (€15/month)

-- Create enum types if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'business_subscription_tier') THEN
    CREATE TYPE business_subscription_tier AS ENUM ('standard', 'premium', 'elite_marketplace');
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'business_billing_period') THEN
    CREATE TYPE business_billing_period AS ENUM ('monthly', 'annual');
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'business_subscription_status') THEN
    CREATE TYPE business_subscription_status AS ENUM ('active', 'cancelled', 'expired', 'pending');
  END IF;
END $$;

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.business_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.business_listings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_tier business_subscription_tier NOT NULL,
  billing_period business_billing_period NOT NULL,
  stripe_subscription_id text,
  stripe_customer_id text,
  stripe_price_id text NOT NULL,
  amount_paid decimal(10, 2) NOT NULL DEFAULT 0,
  status business_subscription_status NOT NULL DEFAULT 'pending',
  start_date timestamp with time zone NOT NULL DEFAULT now(),
  end_date timestamp with time zone,
  auto_renew boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(business_id)
);

-- Add missing columns if table exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'business_subscriptions') THEN
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
    -- Add status column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'business_subscriptions' AND column_name = 'status') THEN
      ALTER TABLE public.business_subscriptions ADD COLUMN status business_subscription_status NOT NULL DEFAULT 'pending';
    END IF;
    -- Add amount_paid column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'business_subscriptions' AND column_name = 'amount_paid') THEN
      ALTER TABLE public.business_subscriptions ADD COLUMN amount_paid decimal(10, 2) NOT NULL DEFAULT 0;
    END IF;
    -- Add auto_renew column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'business_subscriptions' AND column_name = 'auto_renew') THEN
      ALTER TABLE public.business_subscriptions ADD COLUMN auto_renew boolean NOT NULL DEFAULT true;
    END IF;
    -- Ensure start_date has default if missing
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'business_subscriptions' AND column_name = 'start_date') THEN
      -- Check if default exists
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'business_subscriptions' 
        AND column_name = 'start_date'
        AND column_default IS NOT NULL
      ) THEN
        ALTER TABLE public.business_subscriptions ALTER COLUMN start_date SET DEFAULT now();
      END IF;
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_business_subscriptions_business_id ON public.business_subscriptions(business_id);
CREATE INDEX IF NOT EXISTS idx_business_subscriptions_user_id ON public.business_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_business_subscriptions_status ON public.business_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_business_subscriptions_stripe_subscription_id ON public.business_subscriptions(stripe_subscription_id);

-- Enable RLS
ALTER TABLE public.business_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop if exists, then create)
DROP POLICY IF EXISTS "Business owners can view their own subscriptions" ON public.business_subscriptions;
CREATE POLICY "Business owners can view their own subscriptions"
  ON public.business_subscriptions
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.business_subscriptions;
CREATE POLICY "Admins can view all subscriptions"
  ON public.business_subscriptions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (user_profiles.role = 'admin' OR user_profiles.is_admin = true)
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_business_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists, then create it
DROP TRIGGER IF EXISTS update_business_subscriptions_updated_at ON public.business_subscriptions;
CREATE TRIGGER update_business_subscriptions_updated_at
  BEFORE UPDATE ON public.business_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_business_subscriptions_updated_at();
