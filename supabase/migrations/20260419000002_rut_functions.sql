-- ============================================
-- Funciones de RUT chileno (reutilizables)
-- ============================================
-- normalize_rut: toma cualquier formato ('12345678-9', '12.345.678-9',
--   '123456789', '12.345.678K') y devuelve formato canónico '12.345.678-9'
--   (con puntos y guión, DV en mayúscula). null si input es null/vacío.
--
-- validate_rut: valida dígito verificador módulo 11. true si el DV coincide
--   con lo calculado. false si no. null si input es null o no parseable.
--
-- Usos:
--   - Validación en Server Actions (select public.validate_rut($1))
--   - Normalización antes de insertar (insert ... values (public.normalize_rut($1)))
--   - Imports batch (este archivo)

create or replace function public.normalize_rut(p_rut text)
returns text
language plpgsql
immutable
as $$
declare
  v_clean text;
  v_body  text;
  v_dv    text;
  v_rev   text;
  v_out   text := '';
  v_i     int;
begin
  if p_rut is null then return null; end if;
  v_clean := upper(regexp_replace(p_rut, '[^0-9kK]', '', 'g'));
  if length(v_clean) < 2 then return null; end if;

  v_body := substring(v_clean from 1 for length(v_clean) - 1);
  v_dv   := substring(v_clean from length(v_clean));

  -- Insertar puntos cada 3 dígitos desde la derecha en v_body
  v_rev := reverse(v_body);
  for v_i in 1..length(v_rev) loop
    v_out := v_out || substring(v_rev from v_i for 1);
    if v_i % 3 = 0 and v_i < length(v_rev) then
      v_out := v_out || '.';
    end if;
  end loop;

  return reverse(v_out) || '-' || v_dv;
end;
$$;

comment on function public.normalize_rut(text) is
  'Normaliza RUT chileno a formato canónico 12.345.678-9. Idempotente.';


create or replace function public.validate_rut(p_rut text)
returns boolean
language plpgsql
immutable
as $$
declare
  v_clean   text;
  v_body    text;
  v_dv      text;
  v_dv_exp  text;
  v_sum     int := 0;
  v_factor  int := 2;
  v_mod     int;
  v_digit   int;
  v_i       int;
begin
  if p_rut is null then return null; end if;
  v_clean := upper(regexp_replace(p_rut, '[^0-9kK]', '', 'g'));
  if length(v_clean) < 2 then return false; end if;

  v_body := substring(v_clean from 1 for length(v_clean) - 1);
  v_dv   := substring(v_clean from length(v_clean));

  -- Verificar que el body sean solo dígitos
  if v_body !~ '^[0-9]+$' then return false; end if;

  -- Algoritmo módulo 11
  for v_i in reverse length(v_body)..1 loop
    v_digit  := substring(v_body from v_i for 1)::int;
    v_sum    := v_sum + (v_digit * v_factor);
    v_factor := case when v_factor = 7 then 2 else v_factor + 1 end;
  end loop;

  v_mod    := 11 - (v_sum % 11);
  v_dv_exp := case v_mod
                when 11 then '0'
                when 10 then 'K'
                else v_mod::text
              end;

  return v_dv = v_dv_exp;
end;
$$;

comment on function public.validate_rut(text) is
  'Valida dígito verificador de RUT chileno (módulo 11). true/false.';


-- Permisos
grant execute on function public.normalize_rut(text) to authenticated;
grant execute on function public.validate_rut(text)  to authenticated;
