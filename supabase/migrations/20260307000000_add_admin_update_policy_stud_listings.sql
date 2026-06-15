-- Add RLS policy to allow admins to update stud_listings
-- This enables admin users to edit any stud listing regardless of ownership

-- Ensure the admin check function exists
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
$$;

-- Drop existing admin update policy if it exists
DROP POLICY IF EXISTS "Admins can update stud listings" ON public.stud_listings;

-- Create policy to allow admins to update any stud listing
CREATE POLICY "Admins can update stud listings"
ON public.stud_listings
FOR UPDATE
TO authenticated
USING (
  public.is_current_user_admin() = true
)
WITH CHECK (
  public.is_current_user_admin() = true
);
