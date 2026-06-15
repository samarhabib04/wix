-- Create marketplace_product_boosts table for individual product boosts
-- Similar to business_boosts but for marketplace products

CREATE TABLE IF NOT EXISTS public.marketplace_product_boosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.marketplace_products(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.business_listings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  stripe_payment_intent_id text,
  stripe_session_id text,
  amount INTEGER NOT NULL DEFAULT 1000, -- €10 in cents (configurable via marketplace_boost_config)
  currency TEXT NOT NULL DEFAULT 'EUR',
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  boost_start_time timestamp with time zone NOT NULL DEFAULT now(),
  boost_end_time timestamp with time zone, -- null means active until pushed out by newer boosts
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_marketplace_product_boosts_product_id ON public.marketplace_product_boosts(product_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_product_boosts_business_id ON public.marketplace_product_boosts(business_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_product_boosts_user_id ON public.marketplace_product_boosts(user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_product_boosts_is_active ON public.marketplace_product_boosts(is_active);
CREATE INDEX IF NOT EXISTS idx_marketplace_product_boosts_start_time ON public.marketplace_product_boosts(boost_start_time DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_product_boosts_payment_status ON public.marketplace_product_boosts(payment_status);
CREATE INDEX IF NOT EXISTS idx_marketplace_product_boosts_stripe_payment_intent_id ON public.marketplace_product_boosts(stripe_payment_intent_id);

-- Enable RLS
ALTER TABLE public.marketplace_product_boosts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own product boosts
CREATE POLICY "Users can view their own product boosts"
  ON public.marketplace_product_boosts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Public can view active paid boosts (for displaying boosted products)
CREATE POLICY "Anyone can view active product boosts"
  ON public.marketplace_product_boosts
  FOR SELECT
  USING (is_active = true AND payment_status = 'paid');

-- Policy: Users can create their own product boosts
CREATE POLICY "Users can create their own product boosts"
  ON public.marketplace_product_boosts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own product boosts
CREATE POLICY "Users can update their own product boosts"
  ON public.marketplace_product_boosts
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Admins can manage all product boosts
CREATE POLICY "Admins can manage all product boosts"
  ON public.marketplace_product_boosts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Policy: Service role can manage product boosts
CREATE POLICY "Service role can manage product boosts"
  ON public.marketplace_product_boosts
  FOR ALL
  USING (true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_marketplace_product_boosts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS marketplace_product_boosts_updated_at ON public.marketplace_product_boosts;
CREATE TRIGGER marketplace_product_boosts_updated_at
  BEFORE UPDATE ON public.marketplace_product_boosts
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_product_boosts_updated_at();
