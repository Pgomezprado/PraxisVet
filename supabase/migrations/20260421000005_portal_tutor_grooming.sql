-- El tutor puede ver los registros de peluquería de SUS mascotas.
-- Coexiste con las policies existentes de admin/groomer (ambas SELECT son OR).
-- Justificación: el tutor como dueño tiene derecho a saber qué servicio se
-- aplicó, cuándo, con quién y cuánto costó. No expone datos clínicos.

CREATE POLICY "grooming_records_tutor_own_read"
  ON public.grooming_records
  FOR SELECT
  TO authenticated
  USING (public.is_tutor_of_pet(pet_id));
