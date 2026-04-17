-- ============================================
-- Seed: Catálogo global de vacunas (extraído del Excel de la clínica 2026-04-16)
-- ============================================
-- Idempotente: usa ON CONFLICT sobre el `code` único.
-- Nombres de dosis EXACTOS como aparecen en el Excel (incluidos typos "1da"/"2ra").
-- ============================================

BEGIN;

-- ============================================================
-- Vacunas (vaccines_catalog)
-- ============================================================

INSERT INTO public.vaccines_catalog (code, name, species, is_active) VALUES
  ('octuple',         'Óctuple Canina',    ARRAY['canino']::text[], true),
  ('antirrabica_canina', 'Antirrábica Canina', ARRAY['canino']::text[], true),
  ('kc',              'KC (Tos de las perreras)', ARRAY['canino']::text[], true),
  ('triple_felina',   'Triple Felina',     ARRAY['felino']::text[], true),
  ('antirrabica_felina', 'Antirrábica Felina', ARRAY['felino']::text[], true),
  ('leucemia_felina', 'Leucemia Felina',   ARRAY['felino']::text[], true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  species = EXCLUDED.species,
  is_active = EXCLUDED.is_active;

-- ============================================================
-- Protocolos (vaccine_protocols)
-- ============================================================

INSERT INTO public.vaccine_protocols (vaccine_id, code, name, species, life_stage)
SELECT v.id, p.code, p.name, p.species, p.life_stage
FROM (VALUES
  ('octuple', 'octuple_puppy',        'Óctuple Puppy',       'canino', 'puppy'),
  ('octuple', 'octuple_adulto',       'Óctuple Adulto',      'canino', 'adulto'),
  ('octuple', 'octuple_anual',        'Óctuple Anual',       'canino', 'anual'),
  ('antirrabica_canina', 'antirrabica_canina_anual', 'Antirrábica Canina Anual', 'canino', 'anual'),
  ('kc', 'kc_anual',                  'KC Anual',            'canino', 'anual'),
  ('triple_felina', 'triple_felina_kitten', 'Triple Felina Kitten', 'felino', 'kitten'),
  ('triple_felina', 'triple_felina_adulto', 'Triple Felina Adulto', 'felino', 'adulto'),
  ('triple_felina', 'triple_felina_anual',  'Triple Felina Anual',  'felino', 'anual'),
  ('antirrabica_felina', 'antirrabica_felina_anual', 'Antirrábica Felina Anual', 'felino', 'anual'),
  ('leucemia_felina', 'leucemia_felina_kitten', 'Leucemia Felina Kitten', 'felino', 'kitten')
) AS p(vaccine_code, code, name, species, life_stage)
JOIN public.vaccines_catalog v ON v.code = p.vaccine_code
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  species = EXCLUDED.species,
  life_stage = EXCLUDED.life_stage,
  vaccine_id = EXCLUDED.vaccine_id;

-- ============================================================
-- Dosis (vaccine_protocol_doses)
-- ============================================================
-- Nombres tal como en el Excel (sic: "1da", "2ra" no se corrigen).

-- Limpieza previa para reseed determinista.
DELETE FROM public.vaccine_protocol_doses
WHERE protocol_id IN (
  SELECT id FROM public.vaccine_protocols
  WHERE code IN (
    'octuple_puppy','octuple_adulto','octuple_anual',
    'antirrabica_canina_anual','kc_anual',
    'triple_felina_kitten','triple_felina_adulto','triple_felina_anual',
    'antirrabica_felina_anual','leucemia_felina_kitten'
  )
);

INSERT INTO public.vaccine_protocol_doses (protocol_id, sequence, name, interval_days)
SELECT pr.id, d.sequence, d.name, d.interval_days
FROM (VALUES
  -- Canino — Óctuple Puppy: 21 / 21 / 365
  ('octuple_puppy', 1, '1era Octuple Puppy', 21),
  ('octuple_puppy', 2, '2da Octuple Puppy',  21),
  ('octuple_puppy', 3, '3era Octuple Puppy', 365),

  -- Canino — Óctuple Adulto: 21 / 365  (typos del Excel intactos)
  ('octuple_adulto', 1, '1da Octuple Adulto', 21),
  ('octuple_adulto', 2, '2ra Octuple Adulto', 365),

  -- Canino — Óctuple Anual: 365
  ('octuple_anual', 1, 'Octuple Anual', 365),

  -- Canino — Antirrábica anual
  ('antirrabica_canina_anual', 1, 'Antirrábica', 365),

  -- Canino — KC anual
  ('kc_anual', 1, 'KC', 365),

  -- Felino — Triple Felina Kitten: 21 / 21 / 365
  ('triple_felina_kitten', 1, '1era Triple Felina Kitten', 21),
  ('triple_felina_kitten', 2, '2da Triple Felina Kitten',  21),
  ('triple_felina_kitten', 3, '3era Triple Felina Kitten', 365),

  -- Felino — Triple Felina Adulto: 21 / 365
  ('triple_felina_adulto', 1, '1da Triple Felina Adulto', 21),
  ('triple_felina_adulto', 2, '2da Triple Felina Adulto', 365),

  -- Felino — Triple Felina Anual
  ('triple_felina_anual', 1, 'Triple Felina Anual', 365),

  -- Felino — Antirrábica Felina Anual
  ('antirrabica_felina_anual', 1, 'Antirrábica', 365),

  -- Felino — Leucemia Felina Kitten: 21 / 730
  ('leucemia_felina_kitten', 1, '1era Leucemia Felina Kitten', 21),
  ('leucemia_felina_kitten', 2, '2da Leucemia Felina Kitten',  730)
) AS d(protocol_code, sequence, name, interval_days)
JOIN public.vaccine_protocols pr ON pr.code = d.protocol_code;

COMMIT;
