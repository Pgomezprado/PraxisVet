-- ============================================
-- Superadmin 0003 — elevated SELECT policies
-- ============================================
-- Permite a los platform admins leer TODAS las filas de las tablas
-- del dominio, cruzando el aislamiento por organization_id.
--
-- REGLAS DURAS:
--   * SÓLO SELECT. Nunca INSERT/UPDATE/DELETE con is_platform_admin().
--     El panel es read-only; cualquier acción escrita pasa por un
--     Server Action dedicado que usa service_role + audit log.
--   * Cada policy coexiste con las policies tenant-scoped que ya
--     existen para usuarios normales — PostgreSQL aplica OR entre
--     policies del mismo comando, así que el efecto es "además de
--     lo que ya ves por tu org, si eres platform admin, ves todo".
--
-- Nomenclatura del proyecto: la "clínica" se llama `organizations`
-- en este esquema (no `clinics`). En el lenguaje del panel superadmin
-- seguimos hablando de "clinic" porque es el término de negocio, pero
-- la tabla física es public.organizations.

-- ---- organizations (clínicas / tenants) ----
drop policy if exists "platform_admins_read_all" on public.organizations;
create policy "platform_admins_read_all"
  on public.organizations for select
  to authenticated
  using (public.is_platform_admin());

-- ---- organization_members (staff de cada clínica) ----
drop policy if exists "platform_admins_read_all" on public.organization_members;
create policy "platform_admins_read_all"
  on public.organization_members for select
  to authenticated
  using (public.is_platform_admin());

-- ---- clients (tutores/dueños de mascotas) ----
drop policy if exists "platform_admins_read_all" on public.clients;
create policy "platform_admins_read_all"
  on public.clients for select
  to authenticated
  using (public.is_platform_admin());

-- ---- pets ----
drop policy if exists "platform_admins_read_all" on public.pets;
create policy "platform_admins_read_all"
  on public.pets for select
  to authenticated
  using (public.is_platform_admin());

-- ---- services ----
drop policy if exists "platform_admins_read_all" on public.services;
create policy "platform_admins_read_all"
  on public.services for select
  to authenticated
  using (public.is_platform_admin());

-- ---- appointments ----
drop policy if exists "platform_admins_read_all" on public.appointments;
create policy "platform_admins_read_all"
  on public.appointments for select
  to authenticated
  using (public.is_platform_admin());

-- ---- clinical_records ----
drop policy if exists "platform_admins_read_all" on public.clinical_records;
create policy "platform_admins_read_all"
  on public.clinical_records for select
  to authenticated
  using (public.is_platform_admin());

-- ---- vaccinations ----
drop policy if exists "platform_admins_read_all" on public.vaccinations;
create policy "platform_admins_read_all"
  on public.vaccinations for select
  to authenticated
  using (public.is_platform_admin());

-- ---- prescriptions ----
drop policy if exists "platform_admins_read_all" on public.prescriptions;
create policy "platform_admins_read_all"
  on public.prescriptions for select
  to authenticated
  using (public.is_platform_admin());

-- ---- attachments ----
drop policy if exists "platform_admins_read_all" on public.attachments;
create policy "platform_admins_read_all"
  on public.attachments for select
  to authenticated
  using (public.is_platform_admin());

-- ---- invoices ----
drop policy if exists "platform_admins_read_all" on public.invoices;
create policy "platform_admins_read_all"
  on public.invoices for select
  to authenticated
  using (public.is_platform_admin());

-- ---- invoice_items ----
drop policy if exists "platform_admins_read_all" on public.invoice_items;
create policy "platform_admins_read_all"
  on public.invoice_items for select
  to authenticated
  using (public.is_platform_admin());

-- ---- payments ----
drop policy if exists "platform_admins_read_all" on public.payments;
create policy "platform_admins_read_all"
  on public.payments for select
  to authenticated
  using (public.is_platform_admin());

-- ---- products ----
drop policy if exists "platform_admins_read_all" on public.products;
create policy "platform_admins_read_all"
  on public.products for select
  to authenticated
  using (public.is_platform_admin());

-- ---- stock ----
drop policy if exists "platform_admins_read_all" on public.stock;
create policy "platform_admins_read_all"
  on public.stock for select
  to authenticated
  using (public.is_platform_admin());

-- ---- stock_movements ----
drop policy if exists "platform_admins_read_all" on public.stock_movements;
create policy "platform_admins_read_all"
  on public.stock_movements for select
  to authenticated
  using (public.is_platform_admin());

-- ---- suppliers ----
drop policy if exists "platform_admins_read_all" on public.suppliers;
create policy "platform_admins_read_all"
  on public.suppliers for select
  to authenticated
  using (public.is_platform_admin());

-- ---- grooming_records ----
drop policy if exists "platform_admins_read_all" on public.grooming_records;
create policy "platform_admins_read_all"
  on public.grooming_records for select
  to authenticated
  using (public.is_platform_admin());

-- TODO: cuando exista tabla `subscriptions` (billing del SaaS), agregar policy equivalente.
-- TODO: cuando exista tabla `profiles` separada de organization_members, agregar policy equivalente.
-- TODO: cuando exista tabla `audit_logs` de dominio (distinta de superadmin_audit_log), agregar policy.
