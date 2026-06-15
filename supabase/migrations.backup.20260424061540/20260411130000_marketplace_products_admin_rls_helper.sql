-- Admin marketplace moderation: use SECURITY DEFINER admin helper so policy checks
-- are consistent with other tables and not weakened by user_profiles RLS quirks.

DROP POLICY IF EXISTS "Admins can view all marketplace products" ON public.marketplace_products;

CREATE POLICY "Admins can view all marketplace products"
  ON public.marketplace_products
  FOR SELECT
  TO authenticated
  USING (public.is_current_user_admin() = true);

DROP POLICY IF EXISTS "Admins can approve marketplace products" ON public.marketplace_products;

CREATE POLICY "Admins can update marketplace products"
  ON public.marketplace_products
  FOR UPDATE
  TO authenticated
  USING (public.is_current_user_admin() = true)
  WITH CHECK (public.is_current_user_admin() = true);
