-- Single canonical "live" status for sale listings on the marketplace.
-- Legacy rows used status = 'approved'; new code writes `active` only.
--
-- Only update rows whose seller still exists in auth.users, so listing-status
-- triggers that insert notifications do not violate notifications_user_id_fkey.

UPDATE public.sale_listings sl
SET status = 'active'
WHERE sl.status = 'approved'
  AND EXISTS (SELECT 1 FROM auth.users au WHERE au.id = sl.seller_id);
