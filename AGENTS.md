<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# PraxisVet — Contexto obligatorio para todos los agentes

Antes de proponer features, escribir código, diseñar UI o responder al usuario, todo agente debe conocer el dominio del producto. Son lectura obligatoria:

1. **[docs/CLINIC_FLOW.md](docs/CLINIC_FLOW.md)** — Fuente de verdad del dominio. Roles (Admin, Veterinario, Recepcionista, Peluquero), jornada tipo, flujos E2E médico + peluquería, matriz rol×permisos, particularidades Chile (SII, receta retenida, RUT, CLP), segmentos (vet solo / pequeña / mediana) y alcance del MVP.
2. **[docs/SCHEMA_ADDENDUM.md](docs/SCHEMA_ADDENDUM.md)** — Cambios al esquema de DB respecto a `PLAN_PRAXISVET.md` para soportar peluquería como flujo de primera clase y Chile.
3. **[PLAN_PRAXISVET.md](PLAN_PRAXISVET.md)** — Arquitectura base (multi-tenant, RLS, stack). Leer junto con el addendum — donde haya diferencia, **el addendum gana**.

## Regla de oro
Si una decisión de producto contradice `CLINIC_FLOW.md`, primero se discute y se actualiza el documento, después se implementa. Nunca al revés.
