-- ============================================================================
-- STEP 1: FIX USER_PROFILES RLS POLICY
-- ============================================================================
-- This migration fixes RLS for user_profiles table ONLY
-- Users will only see their own profile, admins will see all profiles
-- ============================================================================

-- ============================================================================
-- PART 1: Remove ALL existing policies on user_profiles
-- ============================================================================
-- This ensures we start with a clean slate

DO $$
DECLARE
    r RECORD;
BEGIN
    -- Find and drop all existing policies
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'user_profiles'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.user_profiles CASCADE';
        RAISE NOTICE '✅ Dropped existing policy: %', r.policyname;
    END LOOP;
    
    -- If no policies existed, this will just do nothing
    IF NOT FOUND THEN
        RAISE NOTICE 'ℹ️ No existing policies found';
    END IF;
END $$;

-- ============================================================================
-- PART 2: Ensure RLS is enabled
-- ============================================================================

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 3: Create helper function to check if user is admin
-- ============================================================================
-- This function uses SECURITY DEFINER to bypass RLS when checking admin status
-- This prevents recursion issues

CREATE OR REPLACE FUNCTION public.check_user_is_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role text;
    user_is_admin boolean;
BEGIN
    -- Query user_profiles directly (bypasses RLS because of SECURITY DEFINER)
    SELECT role, COALESCE(is_admin, false)
    INTO user_role, user_is_admin
    FROM public.user_profiles
    WHERE id = user_id;
    
    -- Return true if user is admin
    IF user_role = 'admin' OR user_is_admin = true THEN
        RETURN true;
    ELSE
        RETURN false;
    END IF;
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RETURN false;
    WHEN OTHERS THEN
        RETURN false;
END;
$$;

-- ============================================================================
-- PART 4: Create the main admin check function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.check_user_is_admin(auth.uid());
$$;

-- ============================================================================
-- PART 5: Create SELECT policy (READ access)
-- ============================================================================
-- This is the most important policy - it controls who can see what

CREATE POLICY "user_profiles_select_policy"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
    -- Allow if user is viewing their own profile
    auth.uid() = id
    OR
    -- Allow if user is admin (using helper function that bypasses RLS)
    public.check_user_is_admin(auth.uid())
);

-- ============================================================================
-- PART 6: Create INSERT policy (CREATE access)
-- ============================================================================

CREATE POLICY "user_profiles_insert_policy"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (
    -- Users can only create their own profile (id must match auth.uid())
    auth.uid() = id
);

-- ============================================================================
-- PART 7: Create UPDATE policy (UPDATE access)
-- ============================================================================

CREATE POLICY "user_profiles_update_policy"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (
    -- Users can update their own profile
    auth.uid() = id
    OR
    -- Admins can update any profile
    public.check_user_is_admin(auth.uid())
)
WITH CHECK (
    -- Same restrictions for the new values
    auth.uid() = id
    OR
    public.check_user_is_admin(auth.uid())
);

-- ============================================================================
-- PART 8: Create DELETE policy (DELETE access)
-- ============================================================================

CREATE POLICY "user_profiles_delete_policy"
ON public.user_profiles
FOR DELETE
TO authenticated
USING (
    -- Only admins can delete profiles
    public.check_user_is_admin(auth.uid())
);

-- ============================================================================
-- VERIFICATION QUERIES - RUN THESE AFTER APPLYING THE MIGRATION
-- ============================================================================

-- ✅ VERIFICATION 1: Check RLS is enabled
-- Expected result: rowsecurity should be 't' (true)
SELECT 
    tablename, 
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '✅ RLS is ENABLED'
        ELSE '❌ RLS is DISABLED'
    END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'user_profiles';

-- ✅ VERIFICATION 2: Check policies were created
-- Expected result: Should see 4 policies (SELECT, INSERT, UPDATE, DELETE)
SELECT 
    policyname,
    cmd as operation,
    CASE 
        WHEN cmd = 'SELECT' THEN '✅ Controls who can READ'
        WHEN cmd = 'INSERT' THEN '✅ Controls who can CREATE'
        WHEN cmd = 'UPDATE' THEN '✅ Controls who can MODIFY'
        WHEN cmd = 'DELETE' THEN '✅ Controls who can DELETE'
    END as description
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'user_profiles'
ORDER BY cmd;

-- ✅ VERIFICATION 3: Test as regular user (seller/buyer/business)
-- Expected result: Should return 1 (only your own profile)
SELECT COUNT(*) as visible_profiles 
FROM public.user_profiles;
-- If you see more than 1, the policy is NOT working correctly

-- ✅ VERIFICATION 4: Test admin check function
-- Expected result: false for regular users, true for admins
SELECT 
    auth.uid() as your_user_id,
    public.is_current_user_admin() as is_admin,
    CASE 
        WHEN public.is_current_user_admin() THEN '✅ You are an admin'
        ELSE '✅ You are a regular user'
    END as status;

-- ✅ VERIFICATION 5: See what profiles you can access
-- Expected result: Only 1 row (your own profile) for regular users
SELECT 
    id,
    email,
    role,
    is_admin,
    first_name,
    last_name
FROM public.user_profiles
ORDER BY created_at DESC
LIMIT 10;
-- Regular users should only see 1 row (their own)
-- Admins should see all rows

-- ============================================================================
-- TESTING WITH CURL (After migration is applied)
-- ============================================================================
-- 
-- Test as regular user (seller):
-- curl -i -X GET "https://your-project.supabase.co/rest/v1/user_profiles?select=*" \
--   -H "apikey: YOUR_ANON_KEY" \
--   -H "Authorization: Bearer SELLER_JWT_TOKEN"
-- 
-- Expected: Should return only 1 profile (the seller's own profile)
-- 
-- Test as admin:
-- curl -i -X GET "https://your-project.supabase.co/rest/v1/user_profiles?select=*" \
--   -H "apikey: YOUR_ANON_KEY" \
--   -H "Authorization: Bearer ADMIN_JWT_TOKEN"
-- 
-- Expected: Should return all profiles
-- 
-- ============================================================================
