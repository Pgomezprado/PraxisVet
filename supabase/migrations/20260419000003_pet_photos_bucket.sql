-- ============================================
-- Migration: Pet photos storage bucket
-- ============================================
-- Primer uso de Supabase Storage en PraxisVet.
-- Bucket público (URLs estables en pets.photo_url) con path
-- "{org_id}/{uuid}.{ext}". La RLS protege escritura por org.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pet-photos',
  'pet-photos',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Miembros autenticados pueden subir solo dentro del folder de su org.
CREATE POLICY "pet_photos_member_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'pet-photos'
    AND (storage.foldername(name))[1] = public.get_user_org_id()::text
  );

CREATE POLICY "pet_photos_member_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'pet-photos'
    AND (storage.foldername(name))[1] = public.get_user_org_id()::text
  )
  WITH CHECK (
    bucket_id = 'pet-photos'
    AND (storage.foldername(name))[1] = public.get_user_org_id()::text
  );

CREATE POLICY "pet_photos_member_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'pet-photos'
    AND (storage.foldername(name))[1] = public.get_user_org_id()::text
  );

-- SELECT no necesita policy: el bucket es público y sirve vía CDN.
