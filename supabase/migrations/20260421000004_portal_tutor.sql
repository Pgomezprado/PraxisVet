-- Portal del Tutor (F3 del análisis competitivo).
-- Los tutores (dueños de mascota) acceden a una vista read-only de sus
-- propias mascotas. NO son staff de la clínica: no se agregan a
-- organization_members. Se usa una tabla separada de vínculos.

-- 1) Tabla de vínculo cliente ↔ auth user por organización.
CREATE TABLE IF NOT EXISTS public.client_auth_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  invited_at timestamptz NOT NULL DEFAULT now(),
  invited_by uuid REFERENCES public.organization_members(id) ON DELETE SET NULL,
  linked_at timestamptz,
  revoked_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Un cliente solo puede tener un vínculo activo por clínica.
  CONSTRAINT client_auth_links_client_org_active UNIQUE (client_id, org_id),
  -- Un user puede ser tutor en varias clínicas, pero no duplicado en una misma.
  CONSTRAINT client_auth_links_user_org_active UNIQUE (user_id, org_id)
);

CREATE INDEX IF NOT EXISTS idx_client_auth_links_user
  ON public.client_auth_links (user_id)
  WHERE user_id IS NOT NULL AND active = true;

CREATE INDEX IF NOT EXISTS idx_client_auth_links_email
  ON public.client_auth_links (lower(email))
  WHERE linked_at IS NULL;

-- 2) Helpers SQL — seguridad definer para poder leer la tabla desde RLS.
CREATE OR REPLACE FUNCTION public.is_tutor_of_client(check_client_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.client_auth_links
    WHERE client_id = check_client_id
      AND user_id = auth.uid()
      AND active = true
      AND linked_at IS NOT NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.is_tutor_of_pet(check_pet_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.pets p
    JOIN public.client_auth_links cal ON cal.client_id = p.client_id
    WHERE p.id = check_pet_id
      AND cal.user_id = auth.uid()
      AND cal.active = true
      AND cal.linked_at IS NOT NULL
  );
$$;

COMMENT ON FUNCTION public.is_tutor_of_client(uuid) IS
  'Retorna true si el usuario autenticado es tutor del cliente indicado (vínculo activo y confirmado).';

COMMENT ON FUNCTION public.is_tutor_of_pet(uuid) IS
  'Retorna true si el usuario autenticado es tutor de la mascota indicada.';

-- 3) RLS en la nueva tabla.
ALTER TABLE public.client_auth_links ENABLE ROW LEVEL SECURITY;

-- Admins de la clínica gestionan invitaciones; receptionists solo lectura.
CREATE POLICY "client_auth_links_staff_read" ON public.client_auth_links
  FOR SELECT TO authenticated
  USING (
    public.user_has_role_in_org(org_id, ARRAY['admin', 'receptionist']::text[])
  );

CREATE POLICY "client_auth_links_admin_write" ON public.client_auth_links
  FOR ALL TO authenticated
  USING (
    public.user_has_role_in_org(org_id, ARRAY['admin']::text[])
  )
  WITH CHECK (
    public.user_has_role_in_org(org_id, ARRAY['admin']::text[])
  );

-- El propio tutor puede leer su fila (para la ruta /tutor que pregunta
-- "¿a qué clínicas pertenezco?").
CREATE POLICY "client_auth_links_self_read" ON public.client_auth_links
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND active = true);

-- 4) Policies adicionales para que el tutor vea SOLO sus datos.
--    Coexisten con las policies staff existentes, no las reemplazan.

-- a) clients: el tutor ve su propia ficha.
CREATE POLICY "clients_tutor_self_read" ON public.clients
  FOR SELECT TO authenticated
  USING (public.is_tutor_of_client(id));

-- b) pets: el tutor ve solo sus mascotas.
CREATE POLICY "pets_tutor_own_read" ON public.pets
  FOR SELECT TO authenticated
  USING (public.is_tutor_of_pet(id));

-- c) appointments: el tutor ve solo las citas de sus mascotas.
CREATE POLICY "appointments_tutor_own_read" ON public.appointments
  FOR SELECT TO authenticated
  USING (public.is_tutor_of_pet(pet_id));

-- d) appointments: el tutor puede SOLICITAR una cita (queda en pending).
CREATE POLICY "appointments_tutor_request" ON public.appointments
  FOR INSERT TO authenticated
  WITH CHECK (
    status = 'pending'
    AND date >= current_date
    AND public.is_tutor_of_pet(pet_id)
  );

-- e) vaccinations: historial de vacunas de sus mascotas.
CREATE POLICY "vaccinations_tutor_own_read" ON public.vaccinations
  FOR SELECT TO authenticated
  USING (public.is_tutor_of_pet(pet_id));

-- f) dewormings: historial de desparasitaciones.
CREATE POLICY "dewormings_tutor_own_read" ON public.dewormings
  FOR SELECT TO authenticated
  USING (public.is_tutor_of_pet(pet_id));

-- NOTA INTENCIONAL: el portal MVP no expone prescriptions ni clinical_records.
-- Los tutores reciben los PDFs en papel/email fuera del portal — simplificamos
-- RLS para no filtrar metadatos de la consulta. Ampliar en iteración posterior
-- si la clínica lo pide.
--
-- Tampoco se crea policy para: clinical_records, grooming_records, invoices,
-- invoice_items, notification_logs. Esas tablas siguen restringidas a staff
-- por las policies existentes.
