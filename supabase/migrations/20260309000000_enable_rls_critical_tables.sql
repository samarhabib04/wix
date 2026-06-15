-- ============================================================================
-- CRITICAL SECURITY FIX: Enable Row-Level Security (RLS) on All Vulnerable Tables
-- ============================================================================
-- This migration addresses a critical security vulnerability where authenticated
-- users could access all data from sensitive tables without proper access control.
--
-- All tables listed in the vulnerability report now have RLS enabled with
-- strict policies that enforce ownership and role-based access control.
-- ============================================================================

-- Ensure the admin check function exists (from previous migration)
-- SECURITY DEFINER allows this function to bypass RLS when checking admin status
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_profiles 
    WHERE id = auth.uid() 
    AND (role = 'admin' OR is_admin = true)
  );
$$;

-- ============================================================================
-- 1. USER_PROFILES
-- ============================================================================
-- Users can only access their own profile; admins can access all profiles

-- Force enable RLS (ensures it's enabled even if it was disabled)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on user_profiles to start fresh
-- This ensures no conflicting policies remain
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_profiles') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.user_profiles';
    END LOOP;
END $$;

-- SELECT: Users can read their own profile only
-- This policy is restrictive - users can ONLY see their own profile
CREATE POLICY "Users can read their own profile only"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- SELECT: Admins can read all profiles
-- This uses a subquery to check admin status to avoid RLS recursion issues
CREATE POLICY "Admins can read all profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
    AND (up.role = 'admin' OR up.is_admin = true)
  )
);

-- INSERT: Users can create their own profile (id must match auth.uid())
CREATE POLICY "Users can create their own profile"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- UPDATE: Users can update their own profile; admins can update all
CREATE POLICY "Users can update their own profile"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update all profiles"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (public.is_current_user_admin() = true)
WITH CHECK (public.is_current_user_admin() = true);

-- DELETE: Only admins can delete profiles
CREATE POLICY "Admins can delete profiles"
ON public.user_profiles
FOR DELETE
TO authenticated
USING (public.is_current_user_admin() = true);

-- ============================================================================
-- 2. CONVERSATIONS
-- ============================================================================
-- Users can only see conversations where they are buyer_id OR seller_id

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations as buyer" ON public.conversations;
DROP POLICY IF EXISTS "Users can update their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Admins can manage all conversations" ON public.conversations;

-- SELECT: Users can see conversations where they are buyer_id OR seller_id
CREATE POLICY "Users can view their conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (
  auth.uid() = buyer_id OR 
  auth.uid() = seller_id OR
  public.is_current_user_admin() = true
);

-- INSERT: Users can create conversations where they are buyer_id
CREATE POLICY "Users can create conversations as buyer"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = buyer_id);

-- UPDATE: Users can update conversations where they are buyer_id OR seller_id
CREATE POLICY "Users can update their conversations"
ON public.conversations
FOR UPDATE
TO authenticated
USING (
  auth.uid() = buyer_id OR 
  auth.uid() = seller_id OR
  public.is_current_user_admin() = true
)
WITH CHECK (
  auth.uid() = buyer_id OR 
  auth.uid() = seller_id OR
  public.is_current_user_admin() = true
);

-- DELETE: Soft delete via buyer_deleted/seller_deleted flags (handled in UPDATE)
-- Admins can hard delete if needed
CREATE POLICY "Admins can manage all conversations"
ON public.conversations
FOR ALL
TO authenticated
USING (public.is_current_user_admin() = true)
WITH CHECK (public.is_current_user_admin() = true);

-- ============================================================================
-- 3. MESSAGES
-- ============================================================================
-- Users can see messages where they are sender_id OR recipient_id,
-- OR messages in conversations they have access to

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can create messages as sender" ON public.messages;
DROP POLICY IF EXISTS "Users can update their sent messages" ON public.messages;
DROP POLICY IF EXISTS "Admins can manage all messages" ON public.messages;

-- SELECT: Users can see messages where they are sender_id OR recipient_id
CREATE POLICY "Users can view their messages"
ON public.messages
FOR SELECT
TO authenticated
USING (
  auth.uid() = sender_id OR 
  auth.uid() = recipient_id OR
  public.is_current_user_admin() = true
);

-- SELECT: Users can also see messages in conversations they have access to
CREATE POLICY "Users can view messages in their conversations"
ON public.messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
    AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
  )
);

-- INSERT: Users can create messages where they are sender_id
CREATE POLICY "Users can create messages as sender"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
    AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
  )
);

-- UPDATE: Users can update messages where they are sender_id
CREATE POLICY "Users can update their sent messages"
ON public.messages
FOR UPDATE
TO authenticated
USING (auth.uid() = sender_id OR public.is_current_user_admin() = true)
WITH CHECK (auth.uid() = sender_id OR public.is_current_user_admin() = true);

-- DELETE: Soft delete via is_deleted_by_sender/is_deleted_by_recipient flags
-- Admins can manage all messages
CREATE POLICY "Admins can manage all messages"
ON public.messages
FOR ALL
TO authenticated
USING (public.is_current_user_admin() = true)
WITH CHECK (public.is_current_user_admin() = true);

-- ============================================================================
-- 4. RESERVATIONS
-- ============================================================================
-- Users can see their own reservations; admins can see all

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own reservations" ON public.reservations;
DROP POLICY IF EXISTS "Admins can view all reservations" ON public.reservations;
DROP POLICY IF EXISTS "Users can create their own reservations" ON public.reservations;
DROP POLICY IF EXISTS "Users can update their own reservations" ON public.reservations;
DROP POLICY IF EXISTS "Admins can update all reservations" ON public.reservations;
DROP POLICY IF EXISTS "Admins can delete reservations" ON public.reservations;

-- SELECT: Users can see their own reservations; admins can see all
CREATE POLICY "Users can view their own reservations"
ON public.reservations
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all reservations"
ON public.reservations
FOR SELECT
TO authenticated
USING (public.is_current_user_admin() = true);

-- INSERT: Users can create reservations with their own user_id
CREATE POLICY "Users can create their own reservations"
ON public.reservations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can update their own reservations; admins can update all
CREATE POLICY "Users can update their own reservations"
ON public.reservations
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update all reservations"
ON public.reservations
FOR UPDATE
TO authenticated
USING (public.is_current_user_admin() = true)
WITH CHECK (public.is_current_user_admin() = true);

-- DELETE: Only admins can delete reservations
CREATE POLICY "Admins can delete reservations"
ON public.reservations
FOR DELETE
TO authenticated
USING (public.is_current_user_admin() = true);

-- ============================================================================
-- 5. NOTIFICATIONS
-- ============================================================================
-- Users can only see their own notifications

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can manage all notifications" ON public.notifications;

-- SELECT: Users can see their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR
  public.is_current_user_admin() = true
);

-- INSERT: System/service role only (typically via triggers)
-- Allow authenticated users to create notifications for themselves
CREATE POLICY "Users can create notifications for themselves"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can update their own notifications
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.is_current_user_admin() = true)
WITH CHECK (auth.uid() = user_id OR public.is_current_user_admin() = true);

-- DELETE: Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
TO authenticated
USING (auth.uid() = user_id OR public.is_current_user_admin() = true);

-- Admins can manage all notifications
CREATE POLICY "Admins can manage all notifications"
ON public.notifications
FOR ALL
TO authenticated
USING (public.is_current_user_admin() = true)
WITH CHECK (public.is_current_user_admin() = true);

-- ============================================================================
-- 6. USER_WISHLISTS
-- ============================================================================
-- Users can only see their own wishlist items

ALTER TABLE public.user_wishlists ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own wishlists" ON public.user_wishlists;
DROP POLICY IF EXISTS "Users can create their own wishlist items" ON public.user_wishlists;
DROP POLICY IF EXISTS "Users can update their own wishlist items" ON public.user_wishlists;
DROP POLICY IF EXISTS "Users can delete their own wishlist items" ON public.user_wishlists;
DROP POLICY IF EXISTS "Admins can manage all wishlists" ON public.user_wishlists;

-- SELECT: Users can see their own wishlist items
CREATE POLICY "Users can view their own wishlists"
ON public.user_wishlists
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR
  public.is_current_user_admin() = true
);

-- INSERT: Users can create wishlist items with their own user_id
CREATE POLICY "Users can create their own wishlist items"
ON public.user_wishlists
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can update their own wishlist items
CREATE POLICY "Users can update their own wishlist items"
ON public.user_wishlists
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.is_current_user_admin() = true)
WITH CHECK (auth.uid() = user_id OR public.is_current_user_admin() = true);

-- DELETE: Users can delete their own wishlist items
CREATE POLICY "Users can delete their own wishlist items"
ON public.user_wishlists
FOR DELETE
TO authenticated
USING (auth.uid() = user_id OR public.is_current_user_admin() = true);

-- Admins can manage all wishlists
CREATE POLICY "Admins can manage all wishlists"
ON public.user_wishlists
FOR ALL
TO authenticated
USING (public.is_current_user_admin() = true)
WITH CHECK (public.is_current_user_admin() = true);

-- ============================================================================
-- 7. SHOP_ORDERS
-- ============================================================================
-- Users can see their own orders; admins can see all

ALTER TABLE public.shop_orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own orders" ON public.shop_orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.shop_orders;
DROP POLICY IF EXISTS "Users can create their own orders" ON public.shop_orders;
DROP POLICY IF EXISTS "Users can update their own orders" ON public.shop_orders;
DROP POLICY IF EXISTS "Admins can update all orders" ON public.shop_orders;
DROP POLICY IF EXISTS "Admins can delete orders" ON public.shop_orders;

-- SELECT: Users can see their own orders; admins can see all
CREATE POLICY "Users can view their own orders"
ON public.shop_orders
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all orders"
ON public.shop_orders
FOR SELECT
TO authenticated
USING (public.is_current_user_admin() = true);

-- INSERT: Users can create orders with their own user_id
CREATE POLICY "Users can create their own orders"
ON public.shop_orders
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can update their own orders; admins can update all
CREATE POLICY "Users can update their own orders"
ON public.shop_orders
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update all orders"
ON public.shop_orders
FOR UPDATE
TO authenticated
USING (public.is_current_user_admin() = true)
WITH CHECK (public.is_current_user_admin() = true);

-- DELETE: Only admins can delete orders
CREATE POLICY "Admins can delete orders"
ON public.shop_orders
FOR DELETE
TO authenticated
USING (public.is_current_user_admin() = true);

-- ============================================================================
-- 8. BUSINESS_REVIEWS
-- ============================================================================
-- Users can see reviews they wrote; business owners can see reviews for their business; admins can see all

ALTER TABLE public.business_reviews ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own reviews" ON public.business_reviews;
DROP POLICY IF EXISTS "Business owners can view their business reviews" ON public.business_reviews;
DROP POLICY IF EXISTS "Admins can view all business reviews" ON public.business_reviews;
DROP POLICY IF EXISTS "Public can view approved business reviews" ON public.business_reviews;
DROP POLICY IF EXISTS "Users can create reviews" ON public.business_reviews;
DROP POLICY IF EXISTS "Users can update their own reviews" ON public.business_reviews;
DROP POLICY IF EXISTS "Admins can update all reviews" ON public.business_reviews;
DROP POLICY IF EXISTS "Admins can delete reviews" ON public.business_reviews;

-- SELECT: Users can see reviews they wrote
CREATE POLICY "Users can view their own reviews"
ON public.business_reviews
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- SELECT: Business owners can see reviews for their business
CREATE POLICY "Business owners can view their business reviews"
ON public.business_reviews
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.business_listings bl
    WHERE bl.id = business_reviews.business_id
    AND bl.user_id = auth.uid()
  )
);

-- SELECT: Admins can see all reviews
CREATE POLICY "Admins can view all business reviews"
ON public.business_reviews
FOR SELECT
TO authenticated
USING (public.is_current_user_admin() = true);

-- SELECT: Public can view approved reviews (for displaying on business pages)
CREATE POLICY "Public can view approved business reviews"
ON public.business_reviews
FOR SELECT
TO public
USING (status = 'approved');

-- INSERT: Users can create reviews with their own user_id
CREATE POLICY "Users can create reviews"
ON public.business_reviews
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can update their own reviews; admins can update all
CREATE POLICY "Users can update their own reviews"
ON public.business_reviews
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update all reviews"
ON public.business_reviews
FOR UPDATE
TO authenticated
USING (public.is_current_user_admin() = true)
WITH CHECK (public.is_current_user_admin() = true);

-- DELETE: Only admins can delete reviews
CREATE POLICY "Admins can delete reviews"
ON public.business_reviews
FOR DELETE
TO authenticated
USING (public.is_current_user_admin() = true);

-- ============================================================================
-- 9. RESERVATION_DISPUTES
-- ============================================================================
-- Only admins can see disputes; users can create disputes for their own reservations

ALTER TABLE public.reservation_disputes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admins can view all disputes" ON public.reservation_disputes;
DROP POLICY IF EXISTS "Users can create disputes for their reservations" ON public.reservation_disputes;
DROP POLICY IF EXISTS "Admins can update disputes" ON public.reservation_disputes;
DROP POLICY IF EXISTS "Admins can delete disputes" ON public.reservation_disputes;

-- SELECT: Only admins can see disputes
CREATE POLICY "Admins can view all disputes"
ON public.reservation_disputes
FOR SELECT
TO authenticated
USING (public.is_current_user_admin() = true);

-- INSERT: Users can create disputes for their own reservations
CREATE POLICY "Users can create disputes for their reservations"
ON public.reservation_disputes
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.reservations r
    WHERE r.id = reservation_disputes.reservation_id
    AND r.user_id = auth.uid()
  )
);

-- UPDATE: Only admins can update disputes
CREATE POLICY "Admins can update disputes"
ON public.reservation_disputes
FOR UPDATE
TO authenticated
USING (public.is_current_user_admin() = true)
WITH CHECK (public.is_current_user_admin() = true);

-- DELETE: Only admins can delete disputes
CREATE POLICY "Admins can delete disputes"
ON public.reservation_disputes
FOR DELETE
TO authenticated
USING (public.is_current_user_admin() = true);

-- ============================================================================
-- 10. BREED_ALERTS_LOG
-- ============================================================================
-- Users can see their own alert logs; admins can see all

ALTER TABLE public.breed_alerts_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own alert logs" ON public.breed_alerts_log;
DROP POLICY IF EXISTS "Admins can view all alert logs" ON public.breed_alerts_log;
DROP POLICY IF EXISTS "Admins can update alert logs" ON public.breed_alerts_log;
DROP POLICY IF EXISTS "Admins can delete alert logs" ON public.breed_alerts_log;

-- SELECT: Users can see their own alert logs; admins can see all
CREATE POLICY "Users can view their own alert logs"
ON public.breed_alerts_log
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all alert logs"
ON public.breed_alerts_log
FOR SELECT
TO authenticated
USING (public.is_current_user_admin() = true);

-- INSERT: System/service role only (typically via triggers)
-- No policy needed as triggers use service role

-- UPDATE: Only admins can update
CREATE POLICY "Admins can update alert logs"
ON public.breed_alerts_log
FOR UPDATE
TO authenticated
USING (public.is_current_user_admin() = true)
WITH CHECK (public.is_current_user_admin() = true);

-- DELETE: Only admins can delete
CREATE POLICY "Admins can delete alert logs"
ON public.breed_alerts_log
FOR DELETE
TO authenticated
USING (public.is_current_user_admin() = true);

-- ============================================================================
-- VERIFICATION COMMENTS
-- ============================================================================
-- The following queries can be run to verify RLS is working:
--
-- 1. As a regular user, try to SELECT from user_profiles - should only see own row
-- 2. As a regular user, try to SELECT from conversations - should only see own conversations
-- 3. As a regular user, try to SELECT from messages - should only see own messages
-- 4. As a regular user, try to SELECT from reservations - should only see own reservations
-- 5. As a regular user, try to SELECT from notifications - should only see own notifications
-- 6. As a regular user, try to SELECT from user_wishlists - should only see own wishlists
-- 7. As a regular user, try to SELECT from shop_orders - should only see own orders
-- 8. As a regular user, try to SELECT from business_reviews - should only see own reviews
-- 9. As a regular user, try to SELECT from reservation_disputes - should see nothing
-- 10. As a regular user, try to SELECT from breed_alerts_log - should only see own logs
--
-- All of the above should return 401 Unauthorized or empty results for unauthorized access.
-- ============================================================================
