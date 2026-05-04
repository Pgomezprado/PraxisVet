# PraxisVet

**Dominio:** praxisvet.cl
**Estado:** MVP completo. En fase de validación con clínica fundadora y conversión de trials.
**Empresa:** PRAXIS SpA (RUT 78.383.804-4)
**Contacto comercial:** Pablo Gómez Mayor — gomezpablo.mayor@gmail.com / WhatsApp +56 9 9358 9027

---

## Qué Es

Plataforma SaaS multi-tenant de Historia Clínica Electrónica (HCE) para veterinarios y clínicas veterinarias chilenas. Junta agenda, ficha clínica, peluquería, boleta/factura PDF e inventario en un solo lugar. Pensada para clínicas pequeñas y medianas con 1 a ~10 personas en el equipo.

---

## Segmentos objetivo

- **Vet solo:** veterinario independiente que se autogestionó.
- **Clínica pequeña:** 2–5 personas (vet + recep + peluquero).
- **Clínica mediana:** 6–10 personas, puede tener 2+ vets.

**Fuera del MVP:** multi-sucursal (>1 sucursal), clínicas >10 personas, telemedicina.

---

## Propuesta de valor

- **Todo en uno:** agenda + ficha clínica + peluquería + facturación + inventario + portal tutor.
- **Hecho en Chile:** RUT nativo (módulo 11), CLP sin decimales, boleta/factura (SII vía PDF, integración real post-MVP), español chileno.
- **Roles separados:** Admin, Veterinario, Recepcionista, Peluquero. El peluquero NUNCA ve fichas clínicas. RLS a nivel de base de datos.
- **Portal del Tutor:** el dueño de la mascota ve vacunas, desparasitaciones, grooming y exámenes compartidos desde su celular sin app. Incluye Cartola Sanitaria QR (pasaporte para hotel/daycare/SAG) y Carnet Digital con línea de tiempo de toda la vida de la mascota.
- **Sin tarjeta de crédito:** 30 días de prueba gratuita.

---

## Arquitectura

- Multi-tenant por slug: `praxisvet.cl/[clinic-slug]/dashboard`
- Row Level Security (RLS) con `org_id` en Supabase (PostgreSQL)
- Roles: `admin` | `vet` | `receptionist` | `groomer`
- Stack: Next.js 16 + React 19 + TypeScript + Tailwind v4 + shadcn/ui + Supabase + Vercel

---

## Módulos — Estado actual

| Módulo | Estado | Notas |
|--------|--------|-------|
| Auth + Onboarding | ✅ Construido | Login, registro, forgot-password, callback OAuth, flujo onboarding |
| Clientes + Mascotas | ✅ Construido | CRUD completo, validación RUT, taxonomía especies (`canino`/`felino`/`exótico`), tamaño para grooming |
| Citas (Agenda) | ✅ Construido | Vista semana/día, estados completos incl. `ready_for_pickup`, flag `is_dangerous`, constraint de exclusión, horarios por profesional |
| Historial Clínico | ✅ Construido | Anamnesis, examen físico (signos vitales, auscultación), diagnóstico, tratamiento, receta retenida en PDF |
| Vacunas | ✅ Construido | Catálogo global de vacunas, protocolos, dosis |
| Desparasitaciones | ✅ Construido | Módulo propio bajo cada mascota |
| Exámenes (lab + imagenología) | ✅ Construido | Estados `solicitado`/`resultado_cargado`; archivos en bucket privado; compartibles al tutor |
| Peluquería (Grooming) | ✅ Construido | Dashboard propio, registros, pricing configurable por especie/talla/peso |
| Settings / Servicios / Equipo | ✅ Construido | Config clínica, servicios, gestión miembros, horarios profesionales, settings portal tutor |
| Invitaciones de equipo | ✅ Construido | Tokens SHA-256, email vía Resend, flujo accept-invite |
| Facturación | ✅ Construido | Boleta/factura PDF, estados incl. `partial_paid`, abonos parciales, montos CLP |
| Inventario | ✅ Construido | CRUD de productos, movimientos de stock, alertas de stock mínimo |
| Super Admin Panel | ✅ Construido | Dashboard global, detalle de org, audit log, trial gateway |
| Email Reminders (cron) | ✅ Construido | Recordatorios de trial + cumpleaños de mascotas vía Resend |
| Analytics | ✅ Construido | Gráficos de citas, productividad por profesional, top servicios; periodos 1m/3m/año |
| Portal del Tutor | ✅ Construido | Auth magic link; el dueño ve mascotas, historial de citas, vacunas, desparasitaciones, grooming y exámenes compartidos; puede solicitar cita nueva |
| Cartola Sanitaria QR (portal tutor) | ✅ Construido | El tutor genera QR firmado por la clínica como pasaporte sanitario (hotel, daycare, paseador, SAG). Vence 30 días, revocable. Ruta pública `/c/[token]`. PR #27 — 03/05/2026 |
| Carnet Digital Timeline (portal tutor) | ✅ Construido | Línea de tiempo emocional de la mascota: vacunas, peluquerías, consultas, exámenes, hitos sintéticos (cumple, bienvenida, aniversarios). Ruta `/tutor/[clinic]/pets/[petId]/historia`. PR #28 — 04/05/2026 |
| Catálogo de razas configurable | ✅ Construido | Razas configurables por clínica con autocomplete sin tildes. PR #37 — 04/05/2026 |
| Horarios Profesionales | ✅ Construido | Horario semanal recurrente + bloqueos puntuales por profesional |
| WhatsApp Recordatorios | ⏸️ Pausado | Construido y removido de prod 28/04. WIP completo preservado en `stash@{0}` de `feat/whatsapp-v1-restore`. **NO retomar sin aprobación de Meta** de templates prod. |
| Integración SII real | 🔲 Pendiente | MVP genera PDF; delegación a OpenFactura/Haulmer es post-MVP |
| UI Cierre de Caja | 🔲 Pendiente | Tabla `cash_registers` migrada, UI pendiente |

---

## Planes (internos — NO publicar en web todavía)

| Plan | Código | Precio |
|------|--------|--------|
| Básico | `basico` | $29.000 CLP/mes |
| Pro | `pro` | $79.000 CLP/mes |
| Enterprise | `enterprise` | $149.000 CLP/mes |

Flujo de suscripción: `trial` (30 días) → `active` | `past_due` | `expired` | `cancelled`

---

## Prospección activa (mayo 2026)

- Canal principal: Instagram DM desde @praxisvet + seguimiento por correo.
- Templates de DM: `docs/prospeccion-templates-ig.md`
- Lista de prospectos RM: `prospectos_veterinarias_rm.xlsx`
- Estado: en piloto con clínica fundadora. Objetivo: convertir trials a clientes pagos.

---

## Particularidades Chile

| Tema | Regla |
|------|-------|
| Moneda | CLP sin decimales. Formato `$1.290` (punto como separador de miles) |
| Fechas | `dd-MM-yyyy` en UI. ISO 8601 en DB |
| RUT | Validación módulo 11. Formato `12.345.678-9` |
| Doc tributario | `boleta` (B2C) o `factura` (B2B). Nunca "invoice" |
| Idioma UI | Español chileno, segunda persona informal |

---

*Actualizado: 04 Mayo 2026 — Sumadas Cartola Sanitaria QR (PR #27), Carnet Digital Timeline (PR #28) y catálogo de razas configurable (PR #37). WhatsApp recategorizado de "descartado" a "pausado" (WIP preservado, espera aprobación Meta).*
