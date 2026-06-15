-- Public bucket for email-safe logo URLs (bypasses site "coming soon" / password gates on the web app).
-- After migration: Storage → email-branding → upload dog-quest-logo.jpg (copy from repo public/email/dog-quest-logo.jpg).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'email-branding'
  ) THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'email-branding',
      'email-branding',
      true,
      5242880,
      ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    );
  ELSE
    UPDATE storage.buckets
    SET public = true
    WHERE id = 'email-branding';
  END IF;
END $$;

DROP POLICY IF EXISTS "email_branding_public_read" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload email branding" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update email branding" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete email branding" ON storage.objects;

CREATE POLICY "email_branding_public_read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'email-branding');

CREATE POLICY "Admins can upload email branding"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'email-branding'
  AND public.is_current_user_admin() = true
);

CREATE POLICY "Admins can update email branding"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'email-branding'
  AND public.is_current_user_admin() = true
)
WITH CHECK (
  bucket_id = 'email-branding'
  AND public.is_current_user_admin() = true
);

CREATE POLICY "Admins can delete email branding"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'email-branding'
  AND public.is_current_user_admin() = true
);

