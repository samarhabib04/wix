-- Create the breeds storage bucket if it doesn't exist
-- This will create the bucket with proper configuration
DO $$
BEGIN
  -- Check if bucket exists, if not create it
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'breeds'
  ) THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'breeds',
      'breeds',
      true,
      5242880,  -- 5MB limit
      ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    );
  ELSE
    -- Update existing bucket to be public
    UPDATE storage.buckets 
    SET public = true
    WHERE id = 'breeds';
  END IF;
END $$;

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
  bucket_id = 'breeds' 
  AND public.is_current_user_admin() = true
);

-- Allow admins to update breed images
CREATE POLICY "Admins can update breed images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'breeds'
  AND public.is_current_user_admin() = true
)
WITH CHECK (
  bucket_id = 'breeds'
  AND public.is_current_user_admin() = true
);

-- Allow admins to delete breed images
CREATE POLICY "Admins can delete breed images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'breeds'
  AND public.is_current_user_admin() = true
);

-- Allow public to view breed images (for displaying on website)
CREATE POLICY "Public can view breed images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'breeds');

