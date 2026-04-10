# PraxisVet — Plan de Arquitectura y Desarrollo

> Aplicación SaaS multi-tenant para gestión de clínicas veterinarias
> Stack: Next.js 14 · Supabase · Tailwind CSS · shadcn/ui · Vercel

---

## 1. Visión General

PraxisVet es una plataforma SaaS donde múltiples clínicas veterinarias se registran y operan de forma completamente aislada. Cada clínica tiene su propio equipo (administrador, veterinarios, recepcionistas) y sus datos nunca se mezclan con los de otras clínicas.

**Roles del sistema:**
| Rol | Acceso |
|---|---|
| **Super Admin** | Panel global: gestión de clínicas, planes, métricas SaaS |
| **Clinic Admin** | Configuración de su clínica, personal, servicios, reportes |
| **Veterinario** | Sus citas, historiales clínicos, recetas |
| **Recepcionista** | Citas, clientes, mascotas, cobros |

---

## 2. Stack Tecnológico

| Capa | Tecnología | Justificación |
|---|---|---|
| Frontend | Next.js 14 (App Router) | SSR, Server Actions, routing avanzado |
| UI | Tailwind CSS + shadcn/ui | Componentes accesibles y personalizables |
| Base de datos | Supabase (PostgreSQL) | RLS nativo para multi-tenant, realtime, storage |
| Autenticación | Supabase Auth | JWT, magic links, OAuth (Google) |
| Storage | Supabase Storage | Fotos de mascotas, radiografías, adjuntos |
| Email | Resend | Recordatorios de citas, facturas |
| PDF | React-PDF / @react-pdf/renderer | Facturas y fichas clínicas exportables |
| Calendario | FullCalendar | Vista semanal/diaria de agenda |
| Formularios | React Hook Form + Zod | Validación type-safe |
| Estado global | Zustand | Estado ligero del cliente |
| Data fetching | TanStack Query (React Query) | Cache, refetch, loading states |
| Deploy | Vercel + Supabase Cloud | CI/CD automático, edge functions |

---

## 3. Arquitectura Multi-Tenant

### Estrategia: Row Level Security (RLS) con `organization_id`

Cada tabla de negocio incluye una columna `org_id`. Las políticas RLS de Supabase garantizan que cada usuario solo acceda a los registros de su clínica. No hay esquemas separados por clínica — todo convive en el mismo esquema con RLS activado.

```
Usuario autenticado → JWT contiene org_id + role
→ Supabase RLS valida org_id en cada query automáticamente
→ Imposible acceder a datos de otra clínica
```

### Identificación de clínica por subdominio o slug
- URL: `praxisvet.com/[clinic-slug]/dashboard`
- O con subdominios: `mivet.praxisvet.com` (avanzado, Phase 2)

---

## 4. Esquema de Base de Datos

### 4.1 Multi-tenant Core

```sql
-- Clínicas (tenants)
organizations (
  id uuid PK,
  name text,
  slug text UNIQUE,         -- URL identifier
  plan text,                -- 'free' | 'pro' | 'enterprise'
  email text,
  phone text,
  address text,
  logo_url text,
  settings jsonb,           -- timezone, currency, etc.
  active boolean,
  created_at timestamptz
)

-- Miembros de cada clínica
organization_members (
  id uuid PK,
  org_id uuid FK → organizations,
  user_id uuid FK → auth.users,
  role text,                -- 'admin' | 'vet' | 'receptionist'
  first_name text,
  last_name text,
  specialty text,           -- solo veterinarios
  active boolean,
  created_at timestamptz
)
```

### 4.2 Clientes y Mascotas

```sql
clients (
  id uuid PK,
  org_id uuid FK,
  first_name text,
  last_name text,
  email text,
  phone text,
  address text,
  notes text,
  created_at timestamptz
)

pets (
  id uuid PK,
  org_id uuid FK,
  client_id uuid FK → clients,
  name text,
  species text,             -- 'dog' | 'cat' | 'bird' | 'rabbit' | 'other'
  breed text,
  color text,
  sex text,                 -- 'male' | 'female'
  birthdate date,
  microchip text,
  photo_url text,
  notes text,
  active boolean,
  created_at timestamptz
)
```

### 4.3 Servicios y Citas

```sql
services (
  id uuid PK,
  org_id uuid FK,
  name text,
  description text,
  category text,            -- 'consultation' | 'surgery' | 'grooming' | 'vaccine' | etc.
  duration_minutes int,
  price numeric(10,2),
  active boolean
)

appointments (
  id uuid PK,
  org_id uuid FK,
  pet_id uuid FK → pets,
  client_id uuid FK → clients,
  vet_id uuid FK → organization_members,
  service_id uuid FK → services,
  status text,              -- 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
  date date,
  start_time time,
  end_time time,
  reason text,
  notes text,
  reminder_sent boolean,
  created_at timestamptz
)
```

### 4.4 Historial Clínico

```sql
clinical_records (
  id uuid PK,
  org_id uuid FK,
  pet_id uuid FK → pets,
  appointment_id uuid FK → appointments,
  vet_id uuid FK → organization_members,
  date date,
  reason text,
  anamnesis text,
  symptoms text,
  diagnosis text,
  treatment text,
  observations text,
  weight numeric(5,2),
  temperature numeric(4,1),
  heart_rate int,
  created_at timestamptz
)

vaccinations (
  id uuid PK,
  org_id uuid FK,
  pet_id uuid FK → pets,
  clinical_record_id uuid FK,
  vaccine_name text,
  lot_number text,
  date_administered date,
  next_due_date date,
  vet_id uuid FK,
  notes text
)

prescriptions (
  id uuid PK,
  org_id uuid FK,
  clinical_record_id uuid FK → clinical_records,
  medication text,
  dose text,
  frequency text,
  duration text,
  notes text
)

attachments (
  id uuid PK,
  org_id uuid FK,
  entity_type text,         -- 'pet' | 'clinical_record' | 'appointment'
  entity_id uuid,
  file_url text,
  file_name text,
  file_type text,
  uploaded_by uuid FK,
  created_at timestamptz
)
```

### 4.5 Facturación

```sql
invoices (
  id uuid PK,
  org_id uuid FK,
  client_id uuid FK → clients,
  appointment_id uuid FK,
  invoice_number text,
  status text,              -- 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  subtotal numeric(10,2),
  tax_rate numeric(5,2),
  tax_amount numeric(10,2),
  total numeric(10,2),
  due_date date,
  paid_at timestamptz,
  notes text,
  created_at timestamptz
)

invoice_items (
  id uuid PK,
  invoice_id uuid FK → invoices,
  description text,
  quantity numeric(8,2),
  unit_price numeric(10,2),
  total numeric(10,2),
  item_type text            -- 'service' | 'product'
)

payments (
  id uuid PK,
  org_id uuid FK,
  invoice_id uuid FK → invoices,
  amount numeric(10,2),
  method text,              -- 'cash' | 'card' | 'transfer' | 'other'
  reference text,
  notes text,
  created_at timestamptz
)
```

### 4.6 Inventario

```sql
products (
  id uuid PK,
  org_id uuid FK,
  name text,
  sku text,
  category text,            -- 'medicine' | 'supply' | 'food' | 'accessory'
  description text,
  unit text,                -- 'unit' | 'ml' | 'mg' | 'box'
  purchase_price numeric(10,2),
  sale_price numeric(10,2),
  min_stock int,
  active boolean
)

stock (
  id uuid PK,
  product_id uuid FK → products,
  org_id uuid FK,
  quantity numeric(10,2),
  updated_at timestamptz
)

stock_movements (
  id uuid PK,
  org_id uuid FK,
  product_id uuid FK → products,
  type text,                -- 'in' | 'out' | 'adjustment'
  quantity numeric(10,2),
  reason text,              -- 'purchase' | 'sale' | 'usage' | 'loss' | 'return'
  reference_id uuid,        -- appointment_id o invoice_id si aplica
  performed_by uuid FK,
  notes text,
  created_at timestamptz
)

suppliers (
  id uuid PK,
  org_id uuid FK,
  name text,
  contact_name text,
  email text,
  phone text,
  address text,
  notes text,
  active boolean
)
```

---

## 5. Estructura del Proyecto Next.js

```
praxisvet/
├── app/
│   ├── (marketing)/              # Páginas públicas
│   │   ├── page.tsx              # Landing page
│   │   ├── pricing/page.tsx
│   │   └── layout.tsx
│   │
│   ├── auth/                     # Autenticación
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── callback/route.ts     # OAuth callback
│   │
│   ├── onboarding/               # Setup inicial de clínica
│   │   └── page.tsx
│   │
│   ├── [clinic]/                 # Área autenticada por clínica
│   │   ├── layout.tsx            # Sidebar + auth guard
│   │   │
│   │   ├── dashboard/
│   │   │   └── page.tsx          # KPIs, citas del día, alertas
│   │   │
│   │   ├── appointments/
│   │   │   ├── page.tsx          # Calendario + lista
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/page.tsx
│   │   │
│   │   ├── clients/
│   │   │   ├── page.tsx          # Lista de clientes
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx      # Perfil del cliente
│   │   │       └── pets/
│   │   │           └── [petId]/
│   │   │               ├── page.tsx         # Ficha de mascota
│   │   │               └── records/
│   │   │                   └── [recordId]/page.tsx
│   │   │
│   │   ├── billing/
│   │   │   ├── page.tsx          # Dashboard de facturación
│   │   │   ├── invoices/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   └── payments/page.tsx
│   │   │
│   │   ├── inventory/
│   │   │   ├── page.tsx          # Stock overview + alertas
│   │   │   ├── products/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── movements/page.tsx
│   │   │   └── suppliers/page.tsx
│   │   │
│   │   └── settings/
│   │       ├── page.tsx          # Info de la clínica
│   │       ├── staff/page.tsx    # Equipo y roles
│   │       └── services/page.tsx # Servicios y precios
│   │
│   └── admin/                    # Super admin (SaaS owner)
│       ├── layout.tsx
│       ├── page.tsx              # Dashboard global
│       ├── organizations/page.tsx
│       └── users/page.tsx
│
├── components/
│   ├── ui/                       # shadcn/ui components
│   ├── layout/                   # Sidebar, Header, Nav
│   ├── appointments/             # CalendarView, AppointmentCard, etc.
│   ├── clients/                  # ClientForm, PetCard, etc.
│   ├── billing/                  # InvoiceForm, PaymentModal, etc.
│   ├── inventory/                # StockAlert, MovementForm, etc.
│   └── shared/                   # DataTable, SearchInput, etc.
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser client
│   │   ├── server.ts             # Server client (SSR)
│   │   └── middleware.ts         # Auth middleware
│   ├── validations/              # Zod schemas por módulo
│   ├── utils/                    # Helpers, formatters
│   └── constants/                # Enums, opciones de select
│
├── hooks/                        # Custom React hooks
├── store/                        # Zustand stores
├── types/                        # TypeScript types/interfaces
│
├── supabase/
│   ├── migrations/               # SQL migrations
│   └── seed.sql                  # Datos de ejemplo
│
└── middleware.ts                 # Auth + tenant routing
```

---

## 6. Módulos — Detalle Funcional

### 6.1 Agendamiento de Citas
- Calendario semanal/diario con FullCalendar
- Creación rápida desde click en slot libre
- Asignación de mascota, cliente, veterinario y servicio
- Estados visuales con color por estado
- Vista de disponibilidad por veterinario
- Recordatorio automático por email 24h antes (Resend + cron)
- Lista diaria para recepcionistas

### 6.2 Historial Clínico
- Ficha por mascota con tabs: Info · Historial · Vacunas · Adjuntos
- Registro de consulta con todos los signos vitales
- Generación de receta médica exportable a PDF
- Historial de peso con gráfica de línea
- Alertas de vacunas próximas a vencer
- Upload de imágenes/documentos (Supabase Storage)
- Timeline cronológico de atenciones

### 6.3 Cobros y Facturación
- Crear factura vinculada a una cita o de forma manual
- Agregar servicios y productos a ítems de factura
- Calcular impuestos automáticamente
- Exportar factura a PDF
- Registrar pagos parciales o totales
- Dashboard con ingresos del mes, pendientes de cobro
- Alertas de facturas vencidas

### 6.4 Gestión de Inventario
- Catálogo de productos con precio de compra y venta
- Stock en tiempo real con badge de alerta si < mínimo
- Registrar entradas (compra) y salidas (uso clínico, venta)
- Descuento automático de stock al usar un producto en una receta
- Historial de movimientos con filtros
- Gestión de proveedores

---

## 7. Plan de Desarrollo por Fases

### Fase 1 — Fundación (Semana 1–2)
- [ ] Inicializar proyecto Next.js 14 con TypeScript
- [ ] Configurar Tailwind CSS + shadcn/ui
- [ ] Configurar Supabase (proyecto, variables de entorno)
- [ ] Crear todas las migraciones SQL (schema completo)
- [ ] Implementar autenticación (login, register, logout, protected routes)
- [ ] Middleware de auth + resolución de tenant por slug
- [ ] Layout base: sidebar, header, navegación por rol
- [ ] Onboarding: crear clínica al registrarse

### Fase 2 — Clientes y Mascotas (Semana 3)
- [ ] CRUD completo de clientes
- [ ] CRUD completo de mascotas vinculadas a cliente
- [ ] Búsqueda y filtros en listados
- [ ] Upload de foto de mascota

### Fase 3 — Agendamiento (Semana 4)
- [ ] Configuración de servicios por clínica
- [ ] Vista calendario de citas (FullCalendar)
- [ ] Crear/editar/cancelar citas
- [ ] Cambio de estado de cita
- [ ] Integración Resend para recordatorios

### Fase 4 — Historial Clínico (Semana 5)
- [ ] Registro de consulta desde cita completada
- [ ] Vacunaciones con alertas de próxima fecha
- [ ] Recetas con descuento opcional de stock
- [ ] Upload de adjuntos
- [ ] Export PDF de ficha clínica

### Fase 5 — Facturación (Semana 6)
- [ ] Crear facturas vinculadas a citas
- [ ] Gestión de pagos y estados
- [ ] Export PDF de facturas
- [ ] Dashboard de ingresos

### Fase 6 — Inventario (Semana 7)
- [ ] Catálogo de productos
- [ ] Control de stock y movimientos
- [ ] Alertas de stock bajo
- [ ] Gestión de proveedores

### Fase 7 — Polish y Launch (Semana 8)
- [ ] Dashboard principal con KPIs
- [ ] Super Admin panel
- [ ] Responsive / mobile
- [ ] Seed data para demo
- [ ] Deploy en Vercel + Supabase Cloud
- [ ] Variables de entorno en producción

---

## 8. Seguridad y RLS

Todas las tablas deben tener RLS habilitado. Ejemplo de política:

```sql
-- Solo miembros de la clínica pueden ver sus clientes
CREATE POLICY "org_isolation" ON clients
  USING (org_id = (
    SELECT org_id FROM organization_members
    WHERE user_id = auth.uid()
    LIMIT 1
  ));
```

- Los veterinarios solo ven sus propias citas en vista personal
- Los admins ven todo el org
- El Super Admin tiene rol separado fuera del sistema de orgs

---

## 9. Variables de Entorno

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# App
NEXT_PUBLIC_APP_URL=https://praxisvet.com

# Email
RESEND_API_KEY=

# (Opcional) Stripe para cobros del SaaS
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

---

## 10. Comandos Iniciales para Claude Code

Pegar esto en Claude Code para iniciar el proyecto:

```
Crea un proyecto Next.js 14 con TypeScript llamado "praxisvet" con:
- App Router
- Tailwind CSS
- shadcn/ui (init con tema neutral)
- Supabase SSR package (@supabase/ssr)
- React Hook Form + Zod
- TanStack Query v5
- Zustand
- FullCalendar (@fullcalendar/react, @fullcalendar/daygrid, @fullcalendar/timegrid, @fullcalendar/interaction)
- Resend
- @react-pdf/renderer

Luego crea la estructura de carpetas según el plan, las migraciones SQL completas en supabase/migrations/, y empieza por la Fase 1: autenticación y multi-tenant.
```

---

*Documento generado para guiar el desarrollo con Claude Code. Versión 1.0 — Abril 2026.*
