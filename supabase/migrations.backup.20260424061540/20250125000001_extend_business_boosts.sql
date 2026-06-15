-- Extend business_boosts table to include all required fields for tracking
-- Add missing columns: user_id, amount, payment_status, stripe_session_id

DO $$ 
BEGIN
  -- Add user_id column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'business_boosts' 
                 AND column_name = 'user_id') THEN
    ALTER TABLE public.business_boosts 
    ADD COLUMN user_id uuid REFERENCES public.user_profiles(id) ON DELETE CASCADE;
  END IF;

  -- Add amount column if it doesn't exist (in cents, default €10 = 1000)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'business_boosts' 
                 AND column_name = 'amount') THEN
    ALTER TABLE public.business_boosts 
    ADD COLUMN amount INTEGER NOT NULL DEFAULT 1000;
  END IF;

  -- Add payment_status column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'business_boosts' 
                 AND column_name = 'payment_status') THEN
    ALTER TABLE public.business_boosts 
    ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));
  END IF;

  -- Add stripe_session_id column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'business_boosts' 
                 AND column_name = 'stripe_session_id') THEN
    ALTER TABLE public.business_boosts 
    ADD COLUMN stripe_session_id text;
  END IF;

  -- Add currency column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'business_boosts' 
                 AND column_name = 'currency') THEN
    ALTER TABLE public.business_boosts 
    ADD COLUMN currency TEXT NOT NULL DEFAULT 'EUR';
  END IF;
END $$;

-- Create index on payment_status if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_business_boosts_payment_status 
ON public.business_boosts(payment_status);

-- Create index on user_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_business_boosts_user_id 
ON public.business_boosts(user_id);

-- Update RLS policies to include user_id check
DROP POLICY IF EXISTS "Business owners can view their own boosts" ON public.business_boosts;
CREATE POLICY "Business owners can view their own boosts"
  ON public.business_boosts
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.business_listings
      WHERE business_listings.id = business_boosts.business_id
      AND business_listings.user_id = auth.uid()
    )
  );

-- Add policy for business owners to create their own boosts
DROP POLICY IF EXISTS "Business owners can create their own boosts" ON public.business_boosts;
CREATE POLICY "Business owners can create their own boosts"
  ON public.business_boosts
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.business_listings
      WHERE business_listings.id = business_boosts.business_id
      AND business_listings.user_id = auth.uid()
    )
  );

-- Add policy for business owners to update their own boosts
DROP POLICY IF EXISTS "Business owners can update their own boosts" ON public.business_boosts;
CREATE POLICY "Business owners can update their own boosts"
  ON public.business_boosts
  FOR UPDATE
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.business_listings
      WHERE business_listings.id = business_boosts.business_id
      AND business_listings.user_id = auth.uid()
    )
  );

-- Public policy to view active paid boosts (for carousel display)
DROP POLICY IF EXISTS "Anyone can view active business boosts" ON public.business_boosts;
CREATE POLICY "Anyone can view active business boosts"
  ON public.business_boosts
  FOR SELECT
  USING (
    is_active = true 
    AND payment_status = 'paid'
  );
