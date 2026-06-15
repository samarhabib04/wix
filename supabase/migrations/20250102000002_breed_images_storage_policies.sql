-- Storage policies for breed-images bucket
-- Make sure the bucket is created first in Supabase Dashboard: Storage > New Bucket > Name: "breed-images", Public: true

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can upload breed images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update breed images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete breed images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view breed images" ON storage.objects;

-- Allow admins to upload breed images
CREATE POLICY "Admins can upload breed images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'breed-images' 
  AND public.is_current_user_admin() = true
);

-- Allow admins to update breed images
CREATE POLICY "Admins can update breed images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'breed-images'
  AND public.is_current_user_admin() = true
)
WITH CHECK (
  bucket_id = 'breed-images'
  AND public.is_current_user_admin() = true
);

-- Allow admins to delete breed images
CREATE POLICY "Admins can delete breed images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'breed-images'
  AND public.is_current_user_admin() = true
);

-- Allow public to view breed images (for displaying on website)
CREATE POLICY "Public can view breed images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'breed-images');

