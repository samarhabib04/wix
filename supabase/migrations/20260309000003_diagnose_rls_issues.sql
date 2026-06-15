-- ============================================================================
-- RLS DIAGNOSTIC QUERIES
-- ============================================================================
-- Run these queries to diagnose why RLS might not be working
-- ============================================================================

-- 1. Check if RLS is enabled on user_profiles
SELECT 
    tablename, 
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '✅ RLS is ENABLED'
        ELSE '❌ RLS is DISABLED - This is the problem!'
    END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'user_profiles';

-- 2. List all existing policies on user_profiles
SELECT 
    policyname,
    cmd as operation,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'user_profiles'
ORDER BY policyname;

-- 3. Check if admin function exists and works
SELECT 
    proname as function_name,
    prosecdef as is_security_definer,
    CASE 
        WHEN prosecdef THEN '✅ Uses SECURITY DEFINER (can bypass RLS)'
        ELSE '❌ Does NOT use SECURITY DEFINER'
    END as status
FROM pg_proc 
WHERE proname = 'is_current_user_admin';

-- 4. Test the admin check function (run as different users)
-- As seller: Should return false
-- As admin: Should return true
SELECT 
    auth.uid() as current_user_id,
    public.is_current_user_admin() as is_admin,
    CASE 
        WHEN public.is_current_user_admin() THEN '✅ User is admin'
        ELSE '❌ User is NOT admin'
    END as admin_status;

-- 5. Check your current user profile
SELECT 
    id,
    email,
    role,
    is_admin,
    CASE 
        WHEN role = 'admin' OR is_admin = true THEN '✅ This user IS an admin'
        ELSE '❌ This user is NOT an admin'
    END as admin_check
FROM public.user_profiles 
WHERE id = auth.uid();

-- 6. Count total policies on all vulnerable tables
SELECT 
    tablename,
    COUNT(*) as policy_count,
    STRING_AGG(policyname, ', ') as policy_names
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN (
    'user_profiles',
    'conversations',
    'messages',
    'reservations',
    'notifications',
    'user_wishlists',
    'shop_orders',
    'business_reviews',
    'reservation_disputes',
    'breed_alerts_log'
)
GROUP BY tablename
ORDER BY tablename;

-- 7. Check RLS status on all vulnerable tables
SELECT 
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '✅ Protected'
        ELSE '❌ NOT Protected - VULNERABLE!'
    END as protection_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'user_profiles',
    'conversations',
    'messages',
    'reservations',
    'notifications',
    'user_wishlists',
    'shop_orders',
    'business_reviews',
    'reservation_disputes',
    'breed_alerts_log'
)
ORDER BY tablename;

-- ============================================================================
-- COMMON ISSUES AND FIXES
-- ============================================================================
-- 
-- Issue 1: RLS is disabled
-- Fix: Run: ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
--
-- Issue 2: Conflicting policies exist
-- Fix: Drop all policies and recreate them
--
-- Issue 3: Admin function not working
-- Fix: Ensure function uses SECURITY DEFINER and SET search_path = public
--
-- Issue 4: Policies not being evaluated
-- Fix: Check if policies are created correctly and RLS is enabled
--
-- ============================================================================
