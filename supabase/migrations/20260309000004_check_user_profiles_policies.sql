-- ============================================================================
-- CHECK USER_PROFILES POLICIES
-- ============================================================================
-- This query will show all existing policies on user_profiles
-- ============================================================================

-- List all policies on user_profiles with full details
SELECT 
    policyname,
    cmd as operation,
    roles as applicable_roles,
    qual as using_expression,
    with_check as with_check_expression,
    CASE 
        WHEN qual IS NULL AND with_check IS NULL THEN '⚠️ PERMISSIVE - Allows all rows!'
        WHEN qual LIKE '%auth.uid() = id%' THEN '✅ Restrictive - Own data only'
        WHEN qual LIKE '%is_current_user_admin%' OR qual LIKE '%role = ''admin''%' THEN '✅ Admin check'
        ELSE '⚠️ Check expression carefully'
    END as policy_assessment
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'user_profiles'
ORDER BY policyname;

-- Check the actual policy definitions (more detailed)
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'user_profiles';

-- Test: What does auth.uid() return for current user?
SELECT 
    auth.uid() as current_user_id,
    'Current authenticated user ID' as description;

-- Test: Check if current user is admin
SELECT 
    auth.uid() as user_id,
    public.is_current_user_admin() as is_admin_check,
    (SELECT role FROM public.user_profiles WHERE id = auth.uid()) as user_role,
    (SELECT is_admin FROM public.user_profiles WHERE id = auth.uid()) as is_admin_flag;

-- Test: Count profiles visible to current user
SELECT 
    COUNT(*) as visible_profiles,
    'This should be 1 for regular users, all for admins' as expected
FROM public.user_profiles;
