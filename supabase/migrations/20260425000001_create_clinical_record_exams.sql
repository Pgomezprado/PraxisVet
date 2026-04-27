-- ============================================
-- Migration: Exámenes (laboratorio + imagenología)
-- ============================================
-- Sprint 7 — Feature "Exámenes" bajo cada mascota.
--
-- Modelo:
--   - Una solicitud/resultado de examen vive en clinical_record_exams.
--   - Empieza con status='solicitado' (alguien lo pide), pasa a
--     'resultado_cargado' cuando llega el archivo del laboratorio.
--   - El archivo en sí va a Storage (bucket privado 'exam-files').
--     En la fila guardamos sólo el path del archivo, NO una URL pública.
--     El frontend pide signed URLs efímeras vía getSignedExamUrl().
--
-- RLS — matriz de roles (ver CLINIC_FLOW.md sección 5):
--   admin        → SELECT, INSERT, UPDATE, DELETE  (full)
--   vet          → SELECT, INSERT, UPDATE          (no DELETE)
--   receptionist → SELECT, INSERT, UPDATE          (no DELETE)
--                  Necesita poder cargar resultados que llegan al correo
--                  desde laboratorio. La interpretación clínica se oculta
--                  por UI, no por RLS (mismo patrón que clinical_records).
--   groomer      → ningún acceso                   (igual que clinical_records)
--
-- ============================================

-- ============================================
-- 1. Enums
-- ============================================

DO $$ BEGIN
  CREATE TYPE public.exam_type AS ENUM (
    'hemograma',
    'perfil_bioquimico',
    'urianalisis',
    'rayos_x',
    'ecografia',
    'citologia',
    'biopsia',
    'otro'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.exam_status AS ENUM (
    'solicitado',
    'resultado_cargado'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- 2. Tabla
-- ============================================

CREATE TABLE IF NOT EXISTS public.clinical_record_exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  clinical_record_id uuid REFERENCES public.clinical_records(id) ON DELETE SET NULL,

  requested_by uuid NOT NULL REFERENCES public.organization_members(id),
  type public.exam_type NOT NULL,
  custom_type_label text,
  indications text,

  status public.exam_status NOT NULL DEFAULT 'solicitado',

  -- Resultado: file_url guarda el PATH dentro del bucket exam-files,
  -- NO una URL pública (el bucket es privado, se sirve vía signed URL).
  result_file_url text,
  result_file_name text,
  result_file_type text,
  result_date date,
  vet_interpretation text,
  uploaded_by uuid REFERENCES public.organization_members(id),

  shared_with_tutor_at timestamptz,
  requested_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Si type='otro', custom_type_label es obligatorio.
  CONSTRAINT cr_exams_custom_label_required CHECK (
    type <> 'otro' OR (custom_type_label IS NOT NULL AND length(trim(custom_type_label)) > 0)
  ),
  -- Coherencia status ↔ archivo: si está 'resultado_cargado' tiene que existir url.
  CONSTRAINT cr_exams_result_consistency CHECK (
    status = 'solicitado'
    OR (status = 'resultado_cargado' AND result_file_url IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_cr_exams_org_id ON public.clinical_record_exams (org_id);
CREATE INDEX IF NOT EXISTS idx_cr_exams_pet_id ON public.clinical_record_exams (pet_id);
CREATE INDEX IF NOT EXISTS idx_cr_exams_record_id ON public.clinical_record_exams (clinical_record_id);
CREATE INDEX IF NOT EXISTS idx_cr_exams_status ON public.clinical_record_exams (status);

COMMENT ON COLUMN public.clinical_record_exams.result_file_url IS
  'Path dentro del bucket privado exam-files. NO es una URL pública. Se sirve vía signed URL.';
COMMENT ON COLUMN public.clinical_record_exams.requested_by IS
  'organization_members.id (NO auth.users.id) del miembro que solicitó el examen.';
COMMENT ON COLUMN public.clinical_record_exams.uploaded_by IS
  'organization_members.id (NO auth.users.id) del miembro que subió el resultado.';

-- ============================================
-- 3. Trigger updated_at
-- ============================================
-- En el repo no existe una función genérica trigger_set_timestamp; el patrón
-- previo (pets) define una función específica por tabla. Mantenemos ese patrón
-- para no introducir helpers globales sin consenso.

CREATE OR REPLACE FUNCTION public.clinical_record_exams_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cr_exams_set_updated_at ON public.clinical_record_exams;
CREATE TRIGGER trg_cr_exams_set_updated_at
  BEFORE UPDATE ON public.clinical_record_exams
  FOR EACH ROW
  EXECUTE FUNCTION public.clinical_record_exams_set_updated_at();

-- ============================================
-- 4. RLS
-- ============================================

ALTER TABLE public.clinical_record_exams ENABLE ROW LEVEL SECURITY;

-- Admin, vet, receptionist pueden leer; groomer NO.
CREATE POLICY "cr_exams_select"
  ON public.clinical_record_exams
  FOR SELECT
  TO authenticated
  USING (
    public.user_has_role_in_org(org_id, ARRAY['admin', 'vet', 'receptionist'])
  );

-- Admin, vet, receptionist pueden crear (recepcionista sube resultados que
-- llegan por correo del laboratorio).
CREATE POLICY "cr_exams_insert"
  ON public.clinical_record_exams
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.user_has_role_in_org(org_id, ARRAY['admin', 'vet', 'receptionist'])
  );

-- Admin, vet, receptionist pueden actualizar. La restricción de quién puede
-- editar `vet_interpretation` (solo admin + vet) se aplica en la Server Action,
-- no en RLS — mismo patrón que el resto del proyecto donde campos clínicos
-- se ocultan por UI.
CREATE POLICY "cr_exams_update"
  ON public.clinical_record_exams
  FOR UPDATE
  TO authenticated
  USING (
    public.user_has_role_in_org(org_id, ARRAY['admin', 'vet', 'receptionist'])
  )
  WITH CHECK (
    public.user_has_role_in_org(org_id, ARRAY['admin', 'vet', 'receptionist'])
  );

-- Solo admin puede eliminar.
CREATE POLICY "cr_exams_delete"
  ON public.clinical_record_exams
  FOR DELETE
  TO authenticated
  USING (
    public.user_has_role_in_org(org_id, ARRAY['admin'])
  );

-- ============================================
-- 5. Storage bucket privado 'exam-files'
-- ============================================
-- Convención de path: ${org_id}/${pet_id}/${exam_id}/${uuid}.${ext}
-- folder[1] = org_id → es la barrera de RLS por org en storage.objects.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'exam-files',
  'exam-files',
  false,
  10485760, -- 10 MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Bucket privado: necesitamos policies para SELECT también (no es CDN público
-- como pet-photos). La policy aplica el aislamiento por org via foldername[1].
-- La granularidad por rol (no groomer) la garantiza la RLS de la tabla:
-- el groomer no podría siquiera saber qué exam_id existe para construir un path
-- válido, pero igual restringimos al nivel storage usando user_has_role_in_org
-- aprovechando que folder[1] = org_id::text.

DROP POLICY IF EXISTS "exam_files_member_select" ON storage.objects;
DROP POLICY IF EXISTS "exam_files_member_insert" ON storage.objects;
DROP POLICY IF EXISTS "exam_files_member_update" ON storage.objects;
DROP POLICY IF EXISTS "exam_files_member_delete" ON storage.objects;

CREATE POLICY "exam_files_member_select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'exam-files'
    AND public.user_has_role_in_org(
      ((storage.foldername(name))[1])::uuid,
      ARRAY['admin', 'vet', 'receptionist']
    )
  );

CREATE POLICY "exam_files_member_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'exam-files'
    AND public.user_has_role_in_org(
      ((storage.foldername(name))[1])::uuid,
      ARRAY['admin', 'vet', 'receptionist']
    )
  );

CREATE POLICY "exam_files_member_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'exam-files'
    AND public.user_has_role_in_org(
      ((storage.foldername(name))[1])::uuid,
      ARRAY['admin', 'vet', 'receptionist']
    )
  )
  WITH CHECK (
    bucket_id = 'exam-files'
    AND public.user_has_role_in_org(
      ((storage.foldername(name))[1])::uuid,
      ARRAY['admin', 'vet', 'receptionist']
    )
  );

CREATE POLICY "exam_files_member_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'exam-files'
    AND public.user_has_role_in_org(
      ((storage.foldername(name))[1])::uuid,
      ARRAY['admin']
    )
  );

COMMENT ON TABLE public.clinical_record_exams IS
  'Exámenes (lab + imagenología) solicitados/asociados a una mascota. Sprint 7.';

-- ============================================
-- Tutor portal: el dueño ve solo exámenes con resultado cargado
-- y compartidos explícitamente por la clínica.
-- ============================================
CREATE POLICY "cr_exams_tutor_own_read" ON public.clinical_record_exams
  FOR SELECT TO authenticated
  USING (
    public.is_tutor_of_pet(pet_id)
    AND status = 'resultado_cargado'
    AND shared_with_tutor_at IS NOT NULL
  );
