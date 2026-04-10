-- ============================================
-- Migration 8: Politicas RLS completas y granulares
-- ============================================
-- Esta migracion:
-- 1. Crea funciones helper multi-org safe
-- 2. Elimina las policies genericas "org_isolation" (FOR ALL)
-- 3. Las reemplaza con policies granulares por operacion y rol
-- ============================================

-- ============================================
-- PARTE 1: Funciones helper multi-org safe
-- ============================================

-- Funcion que verifica si el usuario pertenece a una organizacion.
-- A diferencia de get_user_org_id(), esta funcion soporta multi-org
-- porque recibe el org_id como parametro y retorna boolean.
CREATE OR REPLACE FUNCTION public.user_belongs_to_org(check_org_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = auth.uid()
      AND org_id = check_org_id
      AND active = true
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Funcion que verifica si el usuario tiene alguno de los roles
-- especificados dentro de una organizacion concreta.
-- Ejemplo: user_has_role_in_org('uuid', ARRAY['admin', 'vet'])
CREATE OR REPLACE FUNCTION public.user_has_role_in_org(
  check_org_id uuid,
  allowed_roles text[]
)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = auth.uid()
      AND org_id = check_org_id
      AND role = ANY(allowed_roles)
      AND active = true
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- PARTE 2: organization_members - Refinar policy de onboarding
-- ============================================

-- Eliminar la policy de INSERT de onboarding que no valida rol.
-- Un usuario solo deberia poder auto-insertarse como admin al crear
-- una nueva org (no deberia poder insertarse en una org existente
-- con cualquier rol). Los admins ya tienen su propia policy de INSERT.
DROP POLICY IF EXISTS "users_can_create_own_membership" ON public.organization_members;

-- Policy de onboarding: el usuario puede insertarse SOLO como admin
-- y SOLO si es el mismo usuario (user_id = auth.uid()).
-- Esto permite el flujo: crear org -> crear membership como admin.
CREATE POLICY "onboarding_self_insert_as_admin"
  ON public.organization_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND role = 'admin'
  );

-- La policy de SELECT existente usa get_user_org_id() que solo
-- retorna un org_id. La reemplazamos con una version multi-org safe.
DROP POLICY IF EXISTS "members_can_read_own_org_members" ON public.organization_members;

CREATE POLICY "members_can_read_own_org_members"
  ON public.organization_members
  FOR SELECT
  TO authenticated
  USING (
    public.user_belongs_to_org(org_id)
  );

-- Las policies de UPDATE y DELETE para admins ya existen y estan
-- correctas (usan subquery directa, no get_user_org_id).
-- No las tocamos.

-- ============================================
-- PARTE 3: clients - Policies granulares
-- ============================================

-- Eliminar policy generica
DROP POLICY IF EXISTS "org_isolation" ON public.clients;

-- Todos los miembros de la org pueden ver clientes
CREATE POLICY "clients_select"
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_org(org_id));

-- Todos los miembros pueden crear clientes (recepcionistas, vets, admins)
CREATE POLICY "clients_insert"
  ON public.clients
  FOR INSERT
  TO authenticated
  WITH CHECK (public.user_belongs_to_org(org_id));

-- Todos los miembros pueden actualizar clientes
CREATE POLICY "clients_update"
  ON public.clients
  FOR UPDATE
  TO authenticated
  USING (public.user_belongs_to_org(org_id))
  WITH CHECK (public.user_belongs_to_org(org_id));

-- Solo admins pueden eliminar clientes
CREATE POLICY "clients_delete"
  ON public.clients
  FOR DELETE
  TO authenticated
  USING (public.user_has_role_in_org(org_id, ARRAY['admin']));

-- ============================================
-- PARTE 4: pets - Policies granulares
-- ============================================

DROP POLICY IF EXISTS "org_isolation" ON public.pets;

CREATE POLICY "pets_select"
  ON public.pets
  FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_org(org_id));

CREATE POLICY "pets_insert"
  ON public.pets
  FOR INSERT
  TO authenticated
  WITH CHECK (public.user_belongs_to_org(org_id));

CREATE POLICY "pets_update"
  ON public.pets
  FOR UPDATE
  TO authenticated
  USING (public.user_belongs_to_org(org_id))
  WITH CHECK (public.user_belongs_to_org(org_id));

-- Solo admins pueden eliminar mascotas
CREATE POLICY "pets_delete"
  ON public.pets
  FOR DELETE
  TO authenticated
  USING (public.user_has_role_in_org(org_id, ARRAY['admin']));

-- ============================================
-- PARTE 5: services - Policies granulares
-- ============================================

DROP POLICY IF EXISTS "org_isolation" ON public.services;

-- Todos los miembros pueden ver servicios
CREATE POLICY "services_select"
  ON public.services
  FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_org(org_id));

-- Solo admins pueden gestionar servicios (crear, editar, eliminar)
CREATE POLICY "services_insert"
  ON public.services
  FOR INSERT
  TO authenticated
  WITH CHECK (public.user_has_role_in_org(org_id, ARRAY['admin']));

CREATE POLICY "services_update"
  ON public.services
  FOR UPDATE
  TO authenticated
  USING (public.user_has_role_in_org(org_id, ARRAY['admin']))
  WITH CHECK (public.user_has_role_in_org(org_id, ARRAY['admin']));

CREATE POLICY "services_delete"
  ON public.services
  FOR DELETE
  TO authenticated
  USING (public.user_has_role_in_org(org_id, ARRAY['admin']));

-- ============================================
-- PARTE 6: appointments - Policies granulares
-- ============================================

DROP POLICY IF EXISTS "org_isolation" ON public.appointments;

-- Todos los miembros pueden ver citas
CREATE POLICY "appointments_select"
  ON public.appointments
  FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_org(org_id));

-- Admins, vets y recepcionistas pueden crear citas (todos los roles)
CREATE POLICY "appointments_insert"
  ON public.appointments
  FOR INSERT
  TO authenticated
  WITH CHECK (public.user_belongs_to_org(org_id));

-- Admins, vets y recepcionistas pueden actualizar citas
CREATE POLICY "appointments_update"
  ON public.appointments
  FOR UPDATE
  TO authenticated
  USING (public.user_belongs_to_org(org_id))
  WITH CHECK (public.user_belongs_to_org(org_id));

-- Solo admins pueden eliminar citas
CREATE POLICY "appointments_delete"
  ON public.appointments
  FOR DELETE
  TO authenticated
  USING (public.user_has_role_in_org(org_id, ARRAY['admin']));

-- ============================================
-- PARTE 7: clinical_records - Solo vets y admins pueden escribir
-- ============================================

DROP POLICY IF EXISTS "org_isolation" ON public.clinical_records;

-- Todos los miembros pueden ver historiales clinicos
CREATE POLICY "clinical_records_select"
  ON public.clinical_records
  FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_org(org_id));

-- Solo veterinarios y admins pueden crear historiales clinicos
CREATE POLICY "clinical_records_insert"
  ON public.clinical_records
  FOR INSERT
  TO authenticated
  WITH CHECK (public.user_has_role_in_org(org_id, ARRAY['admin', 'vet']));

-- Solo veterinarios y admins pueden actualizar historiales clinicos
CREATE POLICY "clinical_records_update"
  ON public.clinical_records
  FOR UPDATE
  TO authenticated
  USING (public.user_has_role_in_org(org_id, ARRAY['admin', 'vet']))
  WITH CHECK (public.user_has_role_in_org(org_id, ARRAY['admin', 'vet']));

-- Solo admins pueden eliminar historiales clinicos
CREATE POLICY "clinical_records_delete"
  ON public.clinical_records
  FOR DELETE
  TO authenticated
  USING (public.user_has_role_in_org(org_id, ARRAY['admin']));

-- ============================================
-- PARTE 8: vaccinations - Solo vets y admins pueden escribir
-- ============================================

DROP POLICY IF EXISTS "org_isolation" ON public.vaccinations;

-- Todos los miembros pueden ver vacunaciones
CREATE POLICY "vaccinations_select"
  ON public.vaccinations
  FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_org(org_id));

-- Solo veterinarios y admins pueden registrar vacunaciones
CREATE POLICY "vaccinations_insert"
  ON public.vaccinations
  FOR INSERT
  TO authenticated
  WITH CHECK (public.user_has_role_in_org(org_id, ARRAY['admin', 'vet']));

-- Solo veterinarios y admins pueden actualizar vacunaciones
CREATE POLICY "vaccinations_update"
  ON public.vaccinations
  FOR UPDATE
  TO authenticated
  USING (public.user_has_role_in_org(org_id, ARRAY['admin', 'vet']))
  WITH CHECK (public.user_has_role_in_org(org_id, ARRAY['admin', 'vet']));

-- Solo admins pueden eliminar registros de vacunacion
CREATE POLICY "vaccinations_delete"
  ON public.vaccinations
  FOR DELETE
  TO authenticated
  USING (public.user_has_role_in_org(org_id, ARRAY['admin']));

-- ============================================
-- PARTE 9: prescriptions - Solo vets y admins pueden escribir
-- ============================================

DROP POLICY IF EXISTS "org_isolation" ON public.prescriptions;

-- Todos los miembros pueden ver prescripciones
CREATE POLICY "prescriptions_select"
  ON public.prescriptions
  FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_org(org_id));

-- Solo veterinarios y admins pueden crear prescripciones
CREATE POLICY "prescriptions_insert"
  ON public.prescriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (public.user_has_role_in_org(org_id, ARRAY['admin', 'vet']));

-- Solo veterinarios y admins pueden actualizar prescripciones
CREATE POLICY "prescriptions_update"
  ON public.prescriptions
  FOR UPDATE
  TO authenticated
  USING (public.user_has_role_in_org(org_id, ARRAY['admin', 'vet']))
  WITH CHECK (public.user_has_role_in_org(org_id, ARRAY['admin', 'vet']));

-- Solo admins pueden eliminar prescripciones
CREATE POLICY "prescriptions_delete"
  ON public.prescriptions
  FOR DELETE
  TO authenticated
  USING (public.user_has_role_in_org(org_id, ARRAY['admin']));

-- ============================================
-- PARTE 10: invoices - Admins y recepcionistas gestionan
-- ============================================

DROP POLICY IF EXISTS "org_isolation" ON public.invoices;

-- Todos los miembros pueden ver facturas
CREATE POLICY "invoices_select"
  ON public.invoices
  FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_org(org_id));

-- Solo admins y recepcionistas pueden crear facturas
CREATE POLICY "invoices_insert"
  ON public.invoices
  FOR INSERT
  TO authenticated
  WITH CHECK (public.user_has_role_in_org(org_id, ARRAY['admin', 'receptionist']));

-- Solo admins y recepcionistas pueden actualizar facturas
CREATE POLICY "invoices_update"
  ON public.invoices
  FOR UPDATE
  TO authenticated
  USING (public.user_has_role_in_org(org_id, ARRAY['admin', 'receptionist']))
  WITH CHECK (public.user_has_role_in_org(org_id, ARRAY['admin', 'receptionist']));

-- Solo admins pueden eliminar facturas
CREATE POLICY "invoices_delete"
  ON public.invoices
  FOR DELETE
  TO authenticated
  USING (public.user_has_role_in_org(org_id, ARRAY['admin']));

-- ============================================
-- PARTE 11: invoice_items - Hereda acceso de la factura padre
-- ============================================

DROP POLICY IF EXISTS "org_isolation_via_invoice" ON public.invoice_items;

-- Todos los miembros pueden ver items si pueden ver la factura
CREATE POLICY "invoice_items_select"
  ON public.invoice_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = invoice_items.invoice_id
        AND public.user_belongs_to_org(invoices.org_id)
    )
  );

-- Solo admins y recepcionistas pueden crear items de factura
CREATE POLICY "invoice_items_insert"
  ON public.invoice_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = invoice_items.invoice_id
        AND public.user_has_role_in_org(invoices.org_id, ARRAY['admin', 'receptionist'])
    )
  );

-- Solo admins y recepcionistas pueden actualizar items de factura
CREATE POLICY "invoice_items_update"
  ON public.invoice_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = invoice_items.invoice_id
        AND public.user_has_role_in_org(invoices.org_id, ARRAY['admin', 'receptionist'])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = invoice_items.invoice_id
        AND public.user_has_role_in_org(invoices.org_id, ARRAY['admin', 'receptionist'])
    )
  );

-- Solo admins pueden eliminar items de factura
CREATE POLICY "invoice_items_delete"
  ON public.invoice_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = invoice_items.invoice_id
        AND public.user_has_role_in_org(invoices.org_id, ARRAY['admin'])
    )
  );

-- ============================================
-- PARTE 12: payments - Admins y recepcionistas gestionan
-- ============================================

DROP POLICY IF EXISTS "org_isolation" ON public.payments;

-- Todos los miembros pueden ver pagos
CREATE POLICY "payments_select"
  ON public.payments
  FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_org(org_id));

-- Solo admins y recepcionistas pueden registrar pagos
CREATE POLICY "payments_insert"
  ON public.payments
  FOR INSERT
  TO authenticated
  WITH CHECK (public.user_has_role_in_org(org_id, ARRAY['admin', 'receptionist']));

-- Solo admins y recepcionistas pueden actualizar pagos
CREATE POLICY "payments_update"
  ON public.payments
  FOR UPDATE
  TO authenticated
  USING (public.user_has_role_in_org(org_id, ARRAY['admin', 'receptionist']))
  WITH CHECK (public.user_has_role_in_org(org_id, ARRAY['admin', 'receptionist']));

-- Solo admins pueden eliminar pagos
CREATE POLICY "payments_delete"
  ON public.payments
  FOR DELETE
  TO authenticated
  USING (public.user_has_role_in_org(org_id, ARRAY['admin']));

-- ============================================
-- PARTE 13: products - Solo admins gestionan inventario
-- ============================================

DROP POLICY IF EXISTS "org_isolation" ON public.products;

-- Todos los miembros pueden ver productos (vets necesitan ver
-- medicamentos para prescripciones)
CREATE POLICY "products_select"
  ON public.products
  FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_org(org_id));

-- Solo admins pueden crear productos
CREATE POLICY "products_insert"
  ON public.products
  FOR INSERT
  TO authenticated
  WITH CHECK (public.user_has_role_in_org(org_id, ARRAY['admin']));

-- Solo admins pueden actualizar productos
CREATE POLICY "products_update"
  ON public.products
  FOR UPDATE
  TO authenticated
  USING (public.user_has_role_in_org(org_id, ARRAY['admin']))
  WITH CHECK (public.user_has_role_in_org(org_id, ARRAY['admin']));

-- Solo admins pueden eliminar productos
CREATE POLICY "products_delete"
  ON public.products
  FOR DELETE
  TO authenticated
  USING (public.user_has_role_in_org(org_id, ARRAY['admin']));

-- ============================================
-- PARTE 14: stock - Solo admins gestionan stock
-- ============================================

DROP POLICY IF EXISTS "org_isolation" ON public.stock;

-- Todos los miembros pueden ver niveles de stock
CREATE POLICY "stock_select"
  ON public.stock
  FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_org(org_id));

-- Solo admins pueden modificar stock directamente
CREATE POLICY "stock_insert"
  ON public.stock
  FOR INSERT
  TO authenticated
  WITH CHECK (public.user_has_role_in_org(org_id, ARRAY['admin']));

CREATE POLICY "stock_update"
  ON public.stock
  FOR UPDATE
  TO authenticated
  USING (public.user_has_role_in_org(org_id, ARRAY['admin']))
  WITH CHECK (public.user_has_role_in_org(org_id, ARRAY['admin']));

CREATE POLICY "stock_delete"
  ON public.stock
  FOR DELETE
  TO authenticated
  USING (public.user_has_role_in_org(org_id, ARRAY['admin']));

-- ============================================
-- PARTE 15: stock_movements - Solo admins gestionan movimientos
-- ============================================

DROP POLICY IF EXISTS "org_isolation" ON public.stock_movements;

-- Todos los miembros pueden ver movimientos de stock
CREATE POLICY "stock_movements_select"
  ON public.stock_movements
  FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_org(org_id));

-- Solo admins pueden registrar movimientos de stock
CREATE POLICY "stock_movements_insert"
  ON public.stock_movements
  FOR INSERT
  TO authenticated
  WITH CHECK (public.user_has_role_in_org(org_id, ARRAY['admin']));

-- Solo admins pueden actualizar movimientos de stock
CREATE POLICY "stock_movements_update"
  ON public.stock_movements
  FOR UPDATE
  TO authenticated
  USING (public.user_has_role_in_org(org_id, ARRAY['admin']))
  WITH CHECK (public.user_has_role_in_org(org_id, ARRAY['admin']));

-- Solo admins pueden eliminar movimientos de stock
CREATE POLICY "stock_movements_delete"
  ON public.stock_movements
  FOR DELETE
  TO authenticated
  USING (public.user_has_role_in_org(org_id, ARRAY['admin']));

-- ============================================
-- PARTE 16: suppliers - Solo admins gestionan proveedores
-- ============================================

DROP POLICY IF EXISTS "org_isolation" ON public.suppliers;

-- Todos los miembros pueden ver proveedores
CREATE POLICY "suppliers_select"
  ON public.suppliers
  FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_org(org_id));

-- Solo admins pueden crear proveedores
CREATE POLICY "suppliers_insert"
  ON public.suppliers
  FOR INSERT
  TO authenticated
  WITH CHECK (public.user_has_role_in_org(org_id, ARRAY['admin']));

-- Solo admins pueden actualizar proveedores
CREATE POLICY "suppliers_update"
  ON public.suppliers
  FOR UPDATE
  TO authenticated
  USING (public.user_has_role_in_org(org_id, ARRAY['admin']))
  WITH CHECK (public.user_has_role_in_org(org_id, ARRAY['admin']));

-- Solo admins pueden eliminar proveedores
CREATE POLICY "suppliers_delete"
  ON public.suppliers
  FOR DELETE
  TO authenticated
  USING (public.user_has_role_in_org(org_id, ARRAY['admin']));

-- ============================================
-- PARTE 17: attachments - Policies granulares
-- ============================================

DROP POLICY IF EXISTS "org_isolation" ON public.attachments;

-- Todos los miembros pueden ver adjuntos de su org
CREATE POLICY "attachments_select"
  ON public.attachments
  FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_org(org_id));

-- Vets y admins pueden subir adjuntos (radiografias, fotos, etc.)
CREATE POLICY "attachments_insert"
  ON public.attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (public.user_has_role_in_org(org_id, ARRAY['admin', 'vet']));

-- Solo admins pueden actualizar adjuntos
CREATE POLICY "attachments_update"
  ON public.attachments
  FOR UPDATE
  TO authenticated
  USING (public.user_has_role_in_org(org_id, ARRAY['admin']))
  WITH CHECK (public.user_has_role_in_org(org_id, ARRAY['admin']));

-- Solo admins pueden eliminar adjuntos
CREATE POLICY "attachments_delete"
  ON public.attachments
  FOR DELETE
  TO authenticated
  USING (public.user_has_role_in_org(org_id, ARRAY['admin']));

-- ============================================
-- PARTE 18: Indice para optimizar las funciones helper
-- ============================================

-- Este indice acelera todas las consultas de RLS que buscan
-- por user_id + active en organization_members
CREATE INDEX IF NOT EXISTS idx_org_members_user_active
  ON public.organization_members (user_id, active)
  WHERE active = true;
