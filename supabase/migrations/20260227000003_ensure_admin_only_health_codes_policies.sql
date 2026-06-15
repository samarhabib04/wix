-- Ensure RLS policies for health_codes table
-- Only admins can add, edit, and delete codes
-- Everyone can view active codes for validation

-- Drop existing policies if they exist (to ensure clean recreation)
DROP POLICY IF EXISTS "Admins can insert health codes" ON public.health_codes;
DROP POLICY IF EXISTS "Admins can update health codes" ON public.health_codes;
DROP POLICY IF EXISTS "Admins can delete health codes" ON public.health_codes;
DROP POLICY IF EXISTS "Admins can view all health codes" ON public.health_codes;

-- Policy 1: Only admins can insert (add) new codes
CREATE POLICY "Admins can insert health codes"
ON public.health_codes
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_current_user_admin() = true
);

-- Policy 2: Only admins can update (edit) existing codes
CREATE POLICY "Admins can update health codes"
ON public.health_codes
FOR UPDATE
TO authenticated
USING (
  public.is_current_user_admin() = true
)
WITH CHECK (
  public.is_current_user_admin() = true
);

-- Policy 3: Only admins can delete codes
CREATE POLICY "Admins can delete health codes"
ON public.health_codes
FOR DELETE
TO authenticated
USING (
  public.is_current_user_admin() = true
);

-- Policy 4: Admins can view all codes (active and inactive) for management
CREATE POLICY "Admins can view all health codes"
ON public.health_codes
FOR SELECT
TO authenticated
USING (
  public.is_current_user_admin() = true
);

-- Note: The "Anyone can view active health codes" policy is already created
-- in the previous migration and allows public/anonymous access to active codes only
