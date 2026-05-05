-- ============================================
-- Migration: Tutor puede subir/quitar la foto de su mascota
-- ============================================
-- El tutor (autenticado vía magic link, vinculado por client_auth_links)
-- ya podía leer pets propias. Aquí habilitamos:
--
--   1) INSERT en bucket público `pet-photos` bajo el prefijo
--      `tutor/{auth.uid()}/...` para mantener su carpeta separada
--      de la de la clínica (`{org_id}/...`).
--
--   2) Una RPC `tutor_set_pet_photo(p_pet_id, p_photo_url)` SECURITY
--      DEFINER que valida ownership (`is_tutor_of_pet`) y actualiza
--      ÚNICAMENTE la columna `photo_url`. Así no abrimos UPDATE general
--      sobre `pets` al tutor (no debe poder modificar nombre, especie,
--      birthdate, etc. — esos son datos clínicos).

-- 1) Storage: tutor INSERT en su propia carpeta del bucket pet-photos.
CREATE POLICY "pet_photos_tutor_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'pet-photos'
    AND (storage.foldername(name))[1] = 'tutor'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- 2) RPC: actualizar sólo photo_url validando que el caller es tutor de la mascota.
CREATE OR REPLACE FUNCTION public.tutor_set_pet_photo(
  p_pet_id uuid,
  p_photo_url text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado'
      USING ERRCODE = '42501';
  END IF;

  IF NOT public.is_tutor_of_pet(p_pet_id) THEN
    RAISE EXCEPTION 'No autorizado'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.pets
     SET photo_url = p_photo_url
   WHERE id = p_pet_id;
END;
$$;

REVOKE ALL ON FUNCTION public.tutor_set_pet_photo(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.tutor_set_pet_photo(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.tutor_set_pet_photo(uuid, text) IS
  'El tutor (validado por is_tutor_of_pet) actualiza únicamente la foto de su mascota. SECURITY DEFINER porque pets no expone UPDATE a tutores.';
