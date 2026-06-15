-- Fix RLS policy for marketplace_products to allow users to view their wishlisted items
-- This ensures users can see marketplace products in their wishlist even if the product
-- status changes (e.g., from 'live' to 'draft' or if admin_approved changes)

-- Create policy to allow authenticated users to view their wishlisted marketplace products
CREATE POLICY "Users can view their wishlisted marketplace products"
  ON public.marketplace_products
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_wishlists
      WHERE user_wishlists.item_id = marketplace_products.id
      AND user_wishlists.item_type = 'product'
      AND user_wishlists.user_id = auth.uid()
    )
  );

-- Add comment for documentation
COMMENT ON POLICY "Users can view their wishlisted marketplace products" ON public.marketplace_products IS 
'Allows authenticated users to view marketplace products that are in their wishlist, regardless of the product status. This ensures wishlisted items remain visible even if product status changes.';
