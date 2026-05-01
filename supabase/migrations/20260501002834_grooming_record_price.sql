-- Sprint hotfix (2026-05-01): permitir registrar el precio cobrado del servicio
-- de peluquería directamente en grooming_records.
--
-- Contexto: Sprint 5 entregó el catálogo `service_price_tiers` para configurar
-- precios de peluquería por especie/talla/peso, pero la tabla `grooming_records`
-- nunca recibió la columna `price`. Como consecuencia, la peluquera de la clínica
-- fundadora (Paws & Hair) ha estado escribiendo el precio dentro del campo
-- `observations`, lo que lo hace inutilizable para reportería y facturación.
--
-- Decisiones:
--   - `numeric(10,0)` para mantener la invariante CLP entero del proyecto.
--   - NULL permitido: hay servicios sin precio (cortesías, registros antiguos,
--     servicios pendientes de definir tarifa).
--   - Sin default: queremos distinguir "no se cargó" (NULL) de "$0" (cortesía
--     explícita). El frontend decide qué hacer con NULL.
--   - Sin CHECK >= 0 para permitir ajustes futuros (ej. notas de crédito);
--     el schema Zod valida >= 0 en la capa de aplicación.

ALTER TABLE grooming_records
  ADD COLUMN IF NOT EXISTS price numeric(10,0) NULL;

COMMENT ON COLUMN grooming_records.price IS
  'Precio cobrado por el servicio en CLP (entero). NULL si todavía no se cargó.';
