# PraxisVet

**Dominio:** praxisvet.com
**Estado:** En desarrollo activo
**Empresa:** PRAXIS SpA

## Qué Es
Plataforma SaaS multi-tenant de Historia Clínica Electrónica (HCE) para veterinarios y clínicas veterinarias.

## Arquitectura
- Multi-tenant por slug: `praxisvet.com/[clinic-slug]/dashboard`
- Row Level Security (RLS) con `org_id` en Supabase
- Roles: Super Admin, Clinic Admin, Veterinario, Recepcionista

## Módulos Planificados
| Módulo | Estado |
|--------|--------|
| Auth + Onboarding | ✅ Construido |
| Clientes + Mascotas | ✅ Construido |
| Citas | ✅ Construido |
| Historial Clínico + Vacunas + Recetas | ✅ Construido |
| Settings / Servicios | ✅ Construido |
| Facturación | 🔲 Pendiente |
| Inventario | 🔲 Pendiente |
| Super Admin Panel | 🔲 Pendiente |

## Plan
Ver `PLAN_PRAXISVET.md` en la raíz del proyecto.
