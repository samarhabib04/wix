-- Update reservations table for new confirmation flow
-- Add new confirmation columns
ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS seller_confirmed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS buyer_confirmed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS dispute_reason TEXT,
ADD COLUMN IF NOT EXISTS dispute_status TEXT DEFAULT 'none' CHECK (dispute_status IN ('none', 'buyer_denied', 'seller_denied', 'admin_reviewing', 'resolved'));

-- Update existing user_confirmed to buyer_confirmed for existing records
UPDATE public.reservations
SET buyer_confirmed = user_confirmed
WHERE buyer_confirmed IS NULL AND user_confirmed IS NOT NULL;

-- Add message column if it doesn't exist (for reservation messages)
ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS message TEXT;

-- Add ip_address column if it doesn't exist (for fraud detection)
ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS ip_address TEXT;

-- Update confirmation_deadline default to 14 days instead of 3 weeks
-- Note: This only affects new reservations, existing ones keep their deadlines
ALTER TABLE public.reservations
ALTER COLUMN confirmation_deadline SET DEFAULT (now() + INTERVAL '14 days');

-- Add RLS policy for sellers to view reservations for their listings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'reservations' 
    AND policyname = 'Sellers can view reservations for their listings'
  ) THEN
    CREATE POLICY "Sellers can view reservations for their listings"
    ON public.reservations
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM public.sale_listings
        WHERE sale_listings.id = reservations.listing_id
        AND sale_listings.seller_id = auth.uid()
      )
    );
  END IF;
END $$;

-- Add RLS policy for sellers to update reservations for their listings (for confirmations/denials)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'reservations' 
    AND policyname = 'Sellers can update reservations for their listings'
  ) THEN
    CREATE POLICY "Sellers can update reservations for their listings"
    ON public.reservations
    FOR UPDATE
    USING (
      EXISTS (
        SELECT 1
        FROM public.sale_listings
        WHERE sale_listings.id = reservations.listing_id
        AND sale_listings.seller_id = auth.uid()
      )
    );
  END IF;
END $$;

-- Create index for faster lookups on listing_id and status
CREATE INDEX IF NOT EXISTS idx_reservations_listing_status
ON public.reservations (listing_id, status);

CREATE INDEX IF NOT EXISTS idx_reservations_dispute_status
ON public.reservations (dispute_status)
WHERE dispute_status != 'none';

-- Add comment explaining status values
COMMENT ON COLUMN public.reservations.status IS 'Status values: pending, awaiting_confirmation, both_confirmed, disputed, confirmed, expired, cancelled, completed';
COMMENT ON COLUMN public.reservations.dispute_status IS 'Dispute status: none, buyer_denied, seller_denied, admin_reviewing, resolved';
COMMENT ON COLUMN public.reservations.seller_confirmed IS 'Whether the seller has confirmed the reservation';
COMMENT ON COLUMN public.reservations.buyer_confirmed IS 'Whether the buyer has confirmed the reservation';
