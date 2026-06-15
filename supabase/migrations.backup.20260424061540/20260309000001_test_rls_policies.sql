-- ============================================================================
-- RLS POLICIES VERIFICATION TESTS
-- ============================================================================
-- Run these queries to verify that Row-Level Security is working correctly.
-- 
-- IMPORTANT: These tests should be run as a regular authenticated user
-- (NOT as admin) to verify that users can only access their own data.
-- ============================================================================

-- ============================================================================
-- TEST 1: USER_PROFILES
-- ============================================================================
-- Expected: Should only return 1 row (the current user's own profile)
-- If you see multiple rows or all users, RLS is NOT working

-- Test as regular user (should only see own profile)
SELECT id, email, role, is_admin 
FROM public.user_profiles;

-- Expected result: Only 1 row (your own profile)
-- If you see admin accounts or other users, RLS is broken


-- ============================================================================
-- TEST 2: CONVERSATIONS
-- ============================================================================
-- Expected: Should only return conversations where you are buyer_id OR seller_id

SELECT id, buyer_id, seller_id, subject, status
FROM public.conversations;

-- Expected result: Only conversations where auth.uid() = buyer_id OR seller_id
-- If you see conversations you're not part of, RLS is broken


-- ============================================================================
-- TEST 3: MESSAGES
-- ============================================================================
-- Expected: Should only return messages where you are sender_id OR recipient_id

SELECT id, sender_id, recipient_id, conversation_id, content
FROM public.messages
LIMIT 10;

-- Expected result: Only messages where auth.uid() = sender_id OR recipient_id
-- If you see messages from other conversations, RLS is broken


-- ============================================================================
-- TEST 4: RESERVATIONS
-- ============================================================================
-- Expected: Should only return reservations where you are user_id

SELECT id, user_id, listing_id, status, amount
FROM public.reservations;

-- Expected result: Only reservations where auth.uid() = user_id
-- If you see other users' reservations, RLS is broken


-- ============================================================================
-- TEST 5: NOTIFICATIONS
-- ============================================================================
-- Expected: Should only return notifications where you are user_id

SELECT id, user_id, title, message, read, type
FROM public.notifications;

-- Expected result: Only notifications where auth.uid() = user_id
-- If you see other users' notifications, RLS is broken


-- ============================================================================
-- TEST 6: USER_WISHLISTS
-- ============================================================================
-- Expected: Should only return wishlist items where you are user_id

SELECT id, user_id, item_id, item_type, created_at
FROM public.user_wishlists;

-- Expected result: Only wishlist items where auth.uid() = user_id
-- If you see other users' wishlists, RLS is broken


-- ============================================================================
-- TEST 7: SHOP_ORDERS
-- ============================================================================
-- Expected: Should only return orders where you are user_id

SELECT id, user_id, total_price, payment_status, fulfillment_status
FROM public.shop_orders;

-- Expected result: Only orders where auth.uid() = user_id
-- If you see other users' orders, RLS is broken


-- ============================================================================
-- TEST 8: BUSINESS_REVIEWS
-- ============================================================================
-- Expected: Should only return reviews you wrote OR reviews for businesses you own

SELECT id, user_id, business_id, rating, comment, status
FROM public.business_reviews;

-- Expected result: 
-- - Reviews where auth.uid() = user_id (reviews you wrote)
-- - Reviews for businesses you own (via business_listings.user_id)
-- If you see reviews for businesses you don't own, RLS is broken


-- ============================================================================
-- TEST 9: RESERVATION_DISPUTES
-- ============================================================================
-- Expected: Should return NO rows (admin-only access)

SELECT id, reservation_id, reason, status, description
FROM public.reservation_disputes;

-- Expected result: Empty result set (0 rows)
-- If you see any disputes, RLS is broken (disputes are admin-only)


-- ============================================================================
-- TEST 10: BREED_ALERTS_LOG
-- ============================================================================
-- Expected: Should only return alert logs where you are user_id

SELECT id, user_id, breed, listing_id, listing_type, email_sent_at
FROM public.breed_alerts_log;

-- Expected result: Only alert logs where auth.uid() = user_id
-- If you see other users' alert logs, RLS is broken


-- ============================================================================
-- TEST 11: ATTEMPT UNAUTHORIZED ACCESS (Should Fail)
-- ============================================================================
-- Try to access data that doesn't belong to you
-- These should return empty results or fail

-- Try to get another user's profile (replace with actual user ID)
-- SELECT * FROM public.user_profiles WHERE id != auth.uid();

-- Try to get conversations you're not part of
-- SELECT * FROM public.conversations 
-- WHERE buyer_id != auth.uid() AND seller_id != auth.uid();

-- Try to get other users' reservations
-- SELECT * FROM public.reservations WHERE user_id != auth.uid();

-- Try to get disputes (should be empty)
-- SELECT * FROM public.reservation_disputes;


-- ============================================================================
-- TEST 12: VERIFY ADMIN ACCESS (Run as Admin)
-- ============================================================================
-- As an admin user, you should be able to see ALL data

-- Admin should see all user profiles
SELECT COUNT(*) as total_profiles FROM public.user_profiles;
-- Expected: Should return count of ALL profiles

-- Admin should see all conversations
SELECT COUNT(*) as total_conversations FROM public.conversations;
-- Expected: Should return count of ALL conversations

-- Admin should see all reservations
SELECT COUNT(*) as total_reservations FROM public.reservations;
-- Expected: Should return count of ALL reservations

-- Admin should see all disputes
SELECT COUNT(*) as total_disputes FROM public.reservation_disputes;
-- Expected: Should return count of ALL disputes


-- ============================================================================
-- TEST 13: VERIFY INSERT/UPDATE/DELETE RESTRICTIONS
-- ============================================================================

-- Try to create a reservation with someone else's user_id (should fail)
-- INSERT INTO public.reservations (user_id, listing_id, amount, fee_amount, status)
-- VALUES ('<other-user-id>', '<listing-id>', 1000, 100, 'pending');
-- Expected: Should fail with permission denied

-- Try to update someone else's notification (should fail)
-- UPDATE public.notifications 
-- SET read = true 
-- WHERE user_id != auth.uid();
-- Expected: Should fail with permission denied or update 0 rows

-- Try to delete someone else's wishlist item (should fail)
-- DELETE FROM public.user_wishlists 
-- WHERE user_id != auth.uid();
-- Expected: Should fail with permission denied or delete 0 rows


-- ============================================================================
-- TEST 14: VERIFY BUSINESS REVIEWS ACCESS
-- ============================================================================
-- If you own a business, you should see reviews for that business

-- Check if you own any businesses
SELECT id, name, user_id 
FROM public.business_listings 
WHERE user_id = auth.uid();

-- If you own businesses, check reviews for those businesses
SELECT br.id, br.business_id, br.rating, br.comment, bl.name as business_name
FROM public.business_reviews br
JOIN public.business_listings bl ON bl.id = br.business_id
WHERE bl.user_id = auth.uid();

-- Expected: Should see reviews for businesses you own
-- If you don't see reviews for your businesses, RLS is broken


-- ============================================================================
-- TEST 15: VERIFY MESSAGES VIA CONVERSATIONS
-- ============================================================================
-- Messages should be accessible if you're part of the conversation

-- Get messages from conversations you're part of
SELECT m.id, m.sender_id, m.recipient_id, m.conversation_id, m.content
FROM public.messages m
JOIN public.conversations c ON c.id = m.conversation_id
WHERE c.buyer_id = auth.uid() OR c.seller_id = auth.uid();

-- Expected: Should see messages from conversations you're part of
-- If you see messages from conversations you're not part of, RLS is broken


-- ============================================================================
-- SUMMARY CHECKLIST
-- ============================================================================
-- After running all tests, verify:
--
-- [ ] user_profiles: Only see your own profile
-- [ ] conversations: Only see conversations you're part of
-- [ ] messages: Only see messages you sent/received or in your conversations
-- [ ] reservations: Only see your own reservations
-- [ ] notifications: Only see your own notifications
-- [ ] user_wishlists: Only see your own wishlist items
-- [ ] shop_orders: Only see your own orders
-- [ ] business_reviews: Only see your reviews or reviews for your businesses
-- [ ] reservation_disputes: See nothing (admin-only)
-- [ ] breed_alerts_log: Only see your own alert logs
-- [ ] Admin can see all data (when logged in as admin)
-- [ ] Cannot insert/update/delete other users' data
--
-- If any test fails, RLS policies need to be reviewed and fixed.
-- ============================================================================
