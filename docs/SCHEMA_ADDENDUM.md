# Schema Addendum — Cambios sobre PLAN_PRAXISVET.md

> Este documento **anula parcialmente** las secciones 4.x de [PLAN_PRAXISVET.md](../PLAN_PRAXISVET.md) para alinear el esquema con [docs/CLINIC_FLOW.md](CLINIC_FLOW.md). Donde haya diferencia, **este addendum gana**.
>
> Motivación: el plan original fue escrito antes de definir peluquería como flujo de primera clase y antes de acotar el mercado a Chile. Tiene 5 brechas que bloquean el modelo operativo.

---

## Brecha 1 — Peluquero no existe como rol

**Problema:** `organization_members.role` solo contempla `'admin' | 'vet' | 'receptionist'`. Falta `'groomer'`.

**Cambio:**
```sql
-- organization_members.role
role text check (role in ('admin', 'vet', 'receptionist', 'groomer'))
```

---

## Brecha 2 — Citas hardcodeadas a veterinario

**Problema:** `appointments.vet_id` obliga a que toda cita esté asignada a un veterinario. Una cita de peluquería no tiene `vet_id`.

**Cambio:** generalizar a `assigned_to` + `type` discriminador.

```sql
appointments (
  id uuid PK,
  org_id uuid FK,
  pet_id uuid FK → pets,
  client_id uuid FK → clients,
  assigned_to uuid FK → organization_members,  -- antes: vet_id
  service_id uuid FK → services,
  type text not null,        -- 'medical' | 'grooming'  ← NUEVO
  status text,               -- 'pending' | 'confirmed' | 'in_progress' | 'ready_for_pickup' | 'completed' | 'cancelled' | 'no_show'
  date date,
  start_time time,
  end_time time,
  reason text,
  notes text,
  reminder_sent boolean,
  created_at timestamptz
)
```

Notas:
- Se agrega el estado `'ready_for_pickup'` para el flujo de peluquería (animal listo, pendiente de cobro).
- `assigned_to` puede apuntar a un vet o a un peluquero. La consistencia con `type` se valida por trigger o check (ver sección RLS más abajo).

---

## Brecha 3 — Notas de peluquería mezcladas con historial clínico

**Problema:** `clinical_records` es médica (anamnesis, diagnóstico, tratamiento) y el peluquero **no debe ver** ese contenido. Si metemos observaciones de peluquería ahí, rompemos la regla de oro de la matriz de permisos.

**Cambio:** tabla separada `grooming_records`.

```sql
grooming_records (
  id uuid PK,
  org_id uuid FK,
  pet_id uuid FK → pets,
  appointment_id uuid FK → appointments,
  groomer_id uuid FK → organization_members,
  date date,
  service_performed text,    -- 'bath' | 'haircut' | 'nails' | 'full' | etc.
  observations text,         -- OPCIONAL: temperamento, piel, tolerancia
  products_used jsonb,       -- insumos de peluquería consumidos
  created_at timestamptz
)
```

RLS: visible a `admin` y `groomer` (todos los de la org). Veterinario puede verla en modo lectura para contexto, pero no editarla. Recepcionista solo ve que existe (para cobrar), no su contenido.

---

## Brecha 4 — Facturación no refleja Chile (SII)

**Problema:** `invoices` usa terminología genérica (`invoice_number`, `tax_rate`). Chile distingue **boleta electrónica** de **factura electrónica** y requiere folio + timbre SII. Además, el cliente de factura necesita RUT.

**Cambio — `clients`:** agregar RUT.
```sql
-- clients: agregar
rut text,                     -- RUT chileno con dígito verificador, validar en app
```

**Cambio — `invoices`:**
```sql
invoices (
  id uuid PK,
  org_id uuid FK,
  client_id uuid FK,
  appointment_id uuid FK,
  document_type text not null, -- 'boleta' | 'factura'   ← NUEVO
  document_number text,        -- folio SII (antes: invoice_number)
  sii_track_id text,           -- id de seguimiento con proveedor SII
  sii_status text,             -- 'pending' | 'accepted' | 'rejected'
  status text,                 -- 'draft' | 'issued' | 'paid' | 'cancelled'
  subtotal numeric(12,0),      -- CLP sin decimales
  tax_amount numeric(12,0),    -- IVA 19% cuando aplique
  total numeric(12,0),
  issued_at timestamptz,
  paid_at timestamptz,
  notes text,
  created_at timestamptz
)
```

Notas:
- Montos en `numeric(12,0)` — el peso chileno no usa decimales.
- El MVP puede guardar `document_type` y generar PDF; la emisión SII real se delega a proveedor (OpenFactura, Haulmer) o queda manual. Fuera de alcance MVP integración directa.
- Eliminamos `due_date` para el MVP: en clínica veterinaria el pago es casi siempre al momento, no hay crédito.

---

## Brecha 5 — Receta retenida y caja diaria

### 5a) Receta retenida
**Problema:** `prescriptions` no marca recetas retenidas (psicotrópicos, ciertos antibióticos) exigidas por normativa chilena.

**Cambio:**
```sql
-- prescriptions: agregar
is_retained boolean default false,
retained_copy_url text        -- PDF firmado cuando retained=true
```

### 5b) Caja diaria
**Problema:** No existe el concepto de "cierre de caja", que es central para el flujo diario del recepcionista.

**Cambio — nueva tabla:**
```sql
cash_registers (
  id uuid PK,
  org_id uuid FK,
  opened_by uuid FK → organization_members,
  closed_by uuid FK → organization_members,
  opened_at timestamptz,
  closed_at timestamptz,
  opening_amount numeric(12,0),
  expected_cash numeric(12,0),
  actual_cash numeric(12,0),
  difference numeric(12,0),
  notes text
)
```

Y `payments.cash_register_id uuid FK` para cuadrar cada pago contra una caja abierta.

---

## Resumen de impacto por módulo

| Módulo | Afectado | Severidad |
|---|---|---|
| Multi-tenant / roles | Agregar `groomer` | Baja |
| Clientes | Agregar `rut` + validación | Baja |
| Agenda / citas | `assigned_to`, `type`, nuevo estado | **Media-alta** |
| Historial clínico | Tabla nueva `grooming_records` | **Media** |
| Facturación | Reescritura parcial (SII) | **Media** |
| Recetas | Campo `is_retained` | Baja |
| Caja | Tabla nueva `cash_registers` | Media |

Ninguno rompe lo construido en `dabab45` (commit del sistema de gestión) más allá de renombres y campos nuevos; son migraciones aditivas en su mayoría. El único rename con impacto es `appointments.vet_id → assigned_to`.

---

## Fuera de este addendum

- Integración SII real (proveedor externo, webhooks, contingencia).
- Reportes al SAG.
- Multi-sucursal.
- Hospitalización.

Estos están explícitamente fuera de alcance MVP en `CLINIC_FLOW.md` sección 8.
