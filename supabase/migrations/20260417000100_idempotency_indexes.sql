-- Índices únicos para prevenir doble-submit idempotente en vaccinations y dewormings.
-- Una segunda inserción con mismos (pet_id, dose_id, date_administered) o
-- (pet_id, type, date_administered) fallará con código 23505 y el server action
-- lo traducirá al usuario como "Ya existe un registro con estos datos".

CREATE UNIQUE INDEX IF NOT EXISTS vaccinations_dose_pet_date_uniq
  ON vaccinations (pet_id, dose_id, date_administered)
  WHERE dose_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS dewormings_type_pet_date_uniq
  ON dewormings (pet_id, type, date_administered);
