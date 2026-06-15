-- Allow expired (and inactive) on sale_listings.status for the expiry system.

ALTER TABLE public.sale_listings
  DROP CONSTRAINT IF EXISTS sale_listings_status_check;

ALTER TABLE public.sale_listings
  ADD CONSTRAINT sale_listings_status_check
  CHECK (
    status = ANY (
      ARRAY[
        'draft'::text,
        'pending_review'::text,
        'approved'::text,
        'rejected'::text,
        'pending_re_approval'::text,
        'active'::text,
        'expired'::text,
        'inactive'::text
      ]
    )
  );
