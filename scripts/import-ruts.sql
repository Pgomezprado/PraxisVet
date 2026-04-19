-- ============================================================
-- Template: import masivo de RUT a clients
-- ============================================================
-- Uso:
--   1. Abrí Supabase Dashboard → SQL Editor del proyecto prod (ref ghjokppbxfozjyantbyu).
--   2. Reemplazá el slug en la línea marcada (por defecto 'paws-hair').
--   3. En el bloque VALUES pegá las filas desde Excel:
--        (identifier, rut_raw)
--      identifier puede ser:  email | phone | nombre completo exacto.
--      rut_raw acepta cualquier formato: 12.345.678-9, 123456789, 12345678-k, etc.
--   4. Corré la query paso por paso (está dividida en secciones).
--   5. Cuando el SELECT final se vea bien, descomentá el UPDATE final y ejecutá.
--
-- Seguridad:
--   - Todo corre dentro de una transacción. Si algo falla, ROLLBACK implícito.
--   - El UPDATE final valida DV con public.validate_rut() y solo actualiza
--     clientes que pertenezcan al org_id correcto.
--   - Preview obligatorio: nunca se ejecuta el UPDATE sin verlo antes.
-- ============================================================

begin;

-- ---------- 1) Parámetro: org a importar ----------
-- Cambiá este slug si es otra clínica.
-- (esta CTE se reutiliza en todas las queries como '(select id from org_target)')
create temp table org_target on commit drop as
  select id from public.organizations where slug = 'paws-hair' limit 1;

-- Validación: la org debe existir. Si devuelve 0 filas, abortar.
select case when (select count(*) from org_target) = 0
            then null
            else (select id from org_target)
       end as org_id_a_importar;


-- ---------- 2) Tabla temporal para el batch ----------
create temp table _rut_import (
  identifier  text not null,   -- email | phone | full name
  rut_raw     text not null,
  rut_norm    text,
  rut_valid   boolean,
  match_type  text,            -- 'email' | 'phone' | 'name' | null (no match)
  client_id   uuid
) on commit drop;


-- ---------- 3) PEGÁ AQUÍ LAS FILAS ----------
-- Formato:  ('identificador', 'rut_en_cualquier_formato')
-- Podés generar esta lista desde Excel con la fórmula:
--   ="('"&A2&"', '"&B2&"'),"
-- y copiar la columna resultante.
insert into _rut_import (identifier, rut_raw) values
  ('cliente1@ejemplo.cl',  '12.345.678-5'),
  ('+56 9 8765 4321',      '11.111.111-1'),
  ('Juan Pérez González',  '22333444-K')
  -- , ('...', '...')
;


-- ---------- 4) Normalizar y validar RUT ----------
update _rut_import set
  rut_norm  = public.normalize_rut(rut_raw),
  rut_valid = public.validate_rut(rut_raw);


-- ---------- 5) Matching contra clients ----------
-- Prioridad: email > phone > nombre completo (case-insensitive, unaccent no disponible por default).
update _rut_import ri set
  match_type = 'email',
  client_id  = c.id
from public.clients c
where c.org_id = (select id from org_target)
  and ri.client_id is null
  and ri.identifier ilike '%@%'
  and lower(c.email) = lower(ri.identifier);

update _rut_import ri set
  match_type = 'phone',
  client_id  = c.id
from public.clients c
where c.org_id = (select id from org_target)
  and ri.client_id is null
  and regexp_replace(ri.identifier, '[^0-9]', '', 'g') = regexp_replace(coalesce(c.phone, ''), '[^0-9]', '', 'g')
  and length(regexp_replace(ri.identifier, '[^0-9]', '', 'g')) >= 8;

update _rut_import ri set
  match_type = 'name',
  client_id  = c.id
from public.clients c
where c.org_id = (select id from org_target)
  and ri.client_id is null
  and lower(btrim(c.first_name || ' ' || c.last_name)) = lower(btrim(ri.identifier));


-- ---------- 6) PREVIEW: ¿qué va a pasar? ----------
-- Revisá esto ANTES de correr el UPDATE final.
select
  'MATCHEA Y SE VA A ACTUALIZAR' as estado,
  ri.identifier, ri.rut_raw, ri.rut_norm, ri.match_type,
  c.first_name || ' ' || c.last_name as cliente, c.email, c.phone,
  c.rut as rut_actual
from _rut_import ri
join public.clients c on c.id = ri.client_id
where ri.client_id is not null
  and ri.rut_valid = true
  and (c.rut is null or btrim(c.rut) = '')
union all
select
  'RUT INVÁLIDO (DV incorrecto)' as estado,
  ri.identifier, ri.rut_raw, ri.rut_norm, ri.match_type,
  null, null, null, null
from _rut_import ri
where ri.rut_valid = false
union all
select
  'SIN MATCH EN CLIENTS' as estado,
  ri.identifier, ri.rut_raw, ri.rut_norm, null,
  null, null, null, null
from _rut_import ri
where ri.client_id is null
union all
select
  'CLIENTE YA TIENE RUT (no se sobrescribe)' as estado,
  ri.identifier, ri.rut_raw, ri.rut_norm, ri.match_type,
  c.first_name || ' ' || c.last_name, c.email, c.phone, c.rut
from _rut_import ri
join public.clients c on c.id = ri.client_id
where c.rut is not null and btrim(c.rut) <> ''
order by 1, 2;


-- ---------- 7) UPDATE real ----------
-- DESCOMENTAR cuando el preview del paso 6 esté ok.

-- update public.clients c set rut = ri.rut_norm, updated_at = now()
-- from _rut_import ri
-- where c.id = ri.client_id
--   and c.org_id = (select id from org_target)
--   and ri.rut_valid = true
--   and (c.rut is null or btrim(c.rut) = '');

-- select count(*) || ' clientes actualizados' as resultado
-- from _rut_import ri
-- join public.clients c on c.id = ri.client_id
-- where c.rut = ri.rut_norm;


-- ---------- 8) Cerrar ----------
-- Si todo ok, COMMIT. Si algo se ve mal, ROLLBACK.
-- commit;
rollback; -- default seguro: dejamos la transacción abierta para revisión manual.
