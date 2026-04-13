# PraxisVet — Flujo Operativo de la Clínica

> **Documento maestro** para todos los agentes (CoFounder, UXDesigner, UXWriter, Frontend, Backend, QA). Describe cómo funciona una clínica veterinaria real, los roles del equipo y el flujo de trabajo end-to-end. Toda decisión de producto, UI, DB o permisos debe consultarse contra este documento.
>
> **Fuente**: Clínica real de referencia (amiga de Pablo) — 1 administrador, 3 veterinarios, 2 peluqueros, 1 secretario.
> **Mercado**: Chile. Segmentos objetivo: vet solo / clínica pequeña (2–4) / clínica mediana (5+).

---

## 1. Roles del equipo

PraxisVet modela **4 roles** como usuarios del sistema. Cada rol tiene permisos distintos y una UI adaptada a su trabajo diario.

### 1.1 Administrador / Dueño
**Quién es:** El dueño de la clínica o el administrador que gestiona el negocio. Puede o no ser veterinario.

**Qué hace:**
- Configura la clínica (datos, horarios, servicios, precios).
- Gestiona el equipo: crea usuarios, asigna roles.
- Ve reportes de ingresos, cobros pendientes, ocupación de agenda, stock.
- Autoriza descuentos, ajustes de inventario, anulación de boletas.
- Revisa cierre de caja diario.

**Qué NO hace (típicamente):** No atiende pacientes ni registra consultas clínicas salvo que además sea veterinario.

**Qué ve:** Todo. Es el único rol con visibilidad completa del negocio.

---

### 1.2 Veterinario/a
**Quién es:** El profesional clínico. En una clínica pequeña puede ser también el dueño; en una mediana hay varios.

**Qué hace:**
- Atiende consultas médicas (agendadas o walk-in).
- Registra ficha clínica: anamnesis, examen, diagnóstico, tratamiento.
- Prescribe medicamentos y emite recetas (incluyendo **receta retenida** cuando corresponde).
- Ordena/interpreta exámenes.
- Realiza vacunaciones, desparasitaciones, cirugías.
- Consume insumos del inventario durante la atención.
- Agenda controles de seguimiento.

**Qué ve:** Agenda propia y del equipo, historial clínico completo de todos los pacientes, inventario (consulta, no gestión), sus propias estadísticas.

**Qué NO ve:** Reportes financieros agregados del negocio, configuración de la clínica, gestión de usuarios.

---

### 1.3 Recepcionista / Secretario
**Quién es:** La cara visible de la clínica. En la clínica de referencia hay 1 secretario que atiende tanto flujo médico como de peluquería.

**Qué hace:**
- Agenda citas (médicas y de peluquería) — **misma agenda unificada**.
- Recibe clientes, confirma llegada, registra clientes/pacientes nuevos.
- Gestiona la sala de espera y el flujo de pacientes.
- Cobra al cliente al finalizar la consulta o servicio (boleta/factura SII).
- Entrega productos vendidos (alimento, accesorios).
- Hace seguimiento telefónico (confirmaciones, recordatorios).
- Cierra caja al final del día.

**Qué ve:** Agenda completa, datos básicos del paciente (nombre, especie, raza, edad, dueño, contacto), ficha del cliente, catálogo de servicios y productos, caja del día.

**Qué NO ve:** Historial clínico completo (anamnesis, diagnósticos, tratamientos detallados). Solo ve lo necesario para agendar y cobrar.

---

### 1.4 Peluquero/a
**Quién es:** Profesional de estética animal. En la clínica de referencia hay 2. **Peluquería es un flujo paralelo al médico, no un servicio extra del veterinario.** Es una línea de ingreso propia con sus propios servicios, precios y clientes recurrentes.

**Qué hace:**
- Atiende servicios de peluquería agendados: baño, corte, corte higiénico, corte de uñas, limpieza de oídos, etc.
- Registra observaciones **opcionales** del animal (ej: "muy nervioso, requiere bozal", "piel sensible", "no tolera secador").
- Consume insumos de peluquería del inventario (shampoo, productos).
- Marca el servicio como completado para que recepción cobre.

**Qué ve:**
- Agenda (filtrada a sus servicios y/o vista unificada).
- Datos del dueño (nombre, teléfono) para contactar si es necesario.
- Datos básicos del animal (nombre, raza, tamaño, observaciones previas de peluquería).
- Historial de servicios de peluquería del animal.

**Qué NO ve:** Historial clínico médico (anamnesis, diagnósticos, medicamentos). Aunque es el mismo animal, los datos médicos son confidenciales para este rol.

---

## 2. Jornada tipo de una clínica

Esta es la secuencia de eventos de un día cualquiera. Cada evento del sistema debe mapear a uno de estos momentos reales.

```
08:30  Apertura
       └─ Admin/Recepcionista: revisar agenda del día, confirmar citas pendientes.

09:00  Primera atención
       ├─ Cliente llega → Recepcionista marca "en sala de espera".
       ├─ Vet llama al paciente → Recepcionista marca "en consulta".
       ├─ Vet registra ficha clínica, consume insumos, prescribe.
       └─ Recepcionista cobra (boleta/factura) → marca "completado".

(En paralelo)
09:00  Peluquería del día
       ├─ Cliente deja al animal (o se queda).
       ├─ Peluquero realiza el servicio, registra observaciones si aplica.
       ├─ Peluquero marca "listo para retiro".
       └─ Recepcionista cobra al cliente cuando pasa a retirar.

Durante el día
       ├─ Walk-ins: cliente sin cita → Recepcionista lo agrega a agenda en vivo.
       ├─ Urgencias: se intercalan con prioridad.
       ├─ Ventas de mostrador: alimento, accesorios, medicamentos sin consulta.
       └─ Seguimientos telefónicos y recordatorios automáticos.

19:00  Cierre
       ├─ Recepcionista cierra caja del día (efectivo, débito, crédito, transferencia).
       ├─ Admin revisa cuadratura.
       └─ Sistema dispara recordatorios de vacunas/controles para los próximos días.
```

---

## 3. Flujos end-to-end

### 3.1 Flujo médico: de la cita al cobro

```
1. Agendamiento
   Actor: Recepcionista (o cliente vía self-service futuro).
   ├─ Busca o crea cliente (RUT, nombre, teléfono, email).
   ├─ Busca o crea paciente (mascota): nombre, especie, raza, sexo, fecha nac., chip.
   ├─ Selecciona servicio (consulta general, control, vacunación, cirugía…).
   ├─ Asigna veterinario y horario.
   └─ Confirma → genera cita en estado "agendada".

2. Recordatorio
   ├─ Sistema envía recordatorio automático (WhatsApp/SMS/email) 24h antes.
   └─ Recepcionista puede confirmar manualmente.

3. Llegada
   Actor: Recepcionista.
   └─ Marca la cita como "en sala de espera".

4. Atención
   Actor: Veterinario.
   ├─ Toma al paciente → cita pasa a "en consulta".
   ├─ Abre ficha clínica del paciente.
   ├─ Registra: motivo, anamnesis, examen físico, signos vitales.
   ├─ Registra diagnóstico(s).
   ├─ Prescribe tratamiento y/o medicamentos.
   ├─ Consume insumos del inventario (vacunas, fármacos, material).
   ├─ Emite receta si aplica (receta retenida para psicotrópicos).
   ├─ Agenda control si corresponde.
   └─ Marca consulta como "finalizada" → genera cobro pendiente.

5. Cobro
   Actor: Recepcionista.
   ├─ Revisa servicios y productos consumidos.
   ├─ Aplica descuentos si autorizados.
   ├─ Emite boleta o factura electrónica (SII).
   ├─ Recibe pago (efectivo / débito / crédito / transferencia).
   └─ Marca cita como "completada".

6. Post-consulta
   ├─ Sistema programa recordatorio de control, vacuna o desparasitación.
   └─ Historial clínico del paciente queda actualizado.
```

### 3.2 Flujo peluquería: de la cita al cobro

```
1. Agendamiento
   Actor: Recepcionista.
   ├─ Busca o crea cliente.
   ├─ Busca o crea paciente (mismo registro que flujo médico).
   ├─ Selecciona servicio de peluquería (baño, corte, corte+baño, higiénico…).
   ├─ Asigna peluquero y horario.
   └─ Confirma → cita en estado "agendada", tipo "peluquería".

2. Recordatorio
   └─ Idéntico al flujo médico.

3. Llegada
   Actor: Recepcionista.
   ├─ Marca llegada.
   └─ Entrega al animal al peluquero o lo pasa a zona de peluquería.

4. Servicio
   Actor: Peluquero.
   ├─ Cita pasa a "en servicio".
   ├─ Realiza el servicio.
   ├─ Registra observaciones (opcional): temperamento, piel, tolerancia, etc.
   ├─ Consume insumos de peluquería.
   └─ Marca servicio como "listo para retiro".

5. Retiro y cobro
   Actor: Recepcionista.
   ├─ Cliente pasa a retirar.
   ├─ Emite boleta/factura SII.
   ├─ Recibe pago.
   └─ Marca cita como "completada".
```

### 3.3 Paciente único, servicios paralelos
Un mismo animal (`patient`) puede recibir servicios médicos y de peluquería indistintamente. **No se duplica el registro del animal.** Lo que se duplica son las "visitas/servicios":

```
Patient: "Luna" (perro, labrador, 3 años, dueña: María Pérez)
├─ Visits/Appointments:
│  ├─ 2026-03-14 · Consulta general · Dr. Ramírez · ✓ completada
│  ├─ 2026-03-20 · Baño + corte · Peluquera Sofía · ✓ completada
│  ├─ 2026-04-02 · Vacunación séxtuple · Dra. Torres · ✓ completada
│  └─ 2026-04-12 · Corte higiénico · Peluquero Diego · 📅 agendada
│
├─ Clinical history: (solo vets + admin)
│  └─ Registros médicos detallados
│
└─ Grooming notes: (peluqueros + admin)
   └─ Observaciones por servicio (opcional)
```

---

## 4. Eventos que disparan trabajo en el sistema

| Evento | Quién lo dispara | Qué pasa |
|---|---|---|
| Cliente nuevo registrado | Recepcionista | Crea `customer`. Puede tener 0..N pacientes. |
| Paciente nuevo registrado | Recepcionista / Veterinario | Crea `patient` vinculado a `customer`. |
| Cita agendada | Recepcionista | Crea `appointment` tipo médica o peluquería. |
| 24h antes de cita | Sistema (cron) | Envía recordatorio al cliente. |
| Cliente llega | Recepcionista | Actualiza estado → "en espera". |
| Profesional toma paciente | Vet / Peluquero | Estado → "en atención". |
| Consulta finalizada | Veterinario | Genera cobro pendiente, actualiza historial, descuenta inventario. |
| Servicio peluquería listo | Peluquero | Estado → "listo para retiro", cobro pendiente. |
| Cobro emitido | Recepcionista | Genera boleta/factura SII, registra pago. |
| Stock bajo umbral | Sistema | Notifica a Admin para reposición. |
| Cierre de caja | Recepcionista | Cuadra día, bloquea ediciones del día. |
| Vacuna/control próximo | Sistema (cron) | Envía recordatorio al cliente. |

---

## 5. Matriz rol × permisos

Leyenda: ✅ ver y editar · 👁 solo ver · ⚠️ ver datos básicos · ❌ sin acceso

| Recurso | Admin | Veterinario | Recepcionista | Peluquero |
|---|---|---|---|---|
| Configuración de clínica | ✅ | ❌ | ❌ | ❌ |
| Gestión de usuarios y roles | ✅ | ❌ | ❌ | ❌ |
| Catálogo de servicios y precios | ✅ | 👁 | 👁 | 👁 |
| Clientes (customers) | ✅ | 👁 | ✅ | ⚠️ (nombre, teléfono) |
| Pacientes (datos básicos) | ✅ | ✅ | ✅ | ⚠️ (nombre, raza, tamaño) |
| Historial clínico médico | ✅ | ✅ | ❌ | ❌ |
| Notas de peluquería | ✅ | 👁 | 👁 | ✅ |
| Agenda (todas las citas) | ✅ | 👁 propia+equipo | ✅ | ✅ (su flujo) |
| Crear/editar citas | ✅ | ✅ | ✅ | ⚠️ (solo sus slots) |
| Inventario (consulta) | ✅ | 👁 | 👁 | 👁 (peluquería) |
| Inventario (gestión, compras) | ✅ | ❌ | ❌ | ❌ |
| Boletas / facturas SII | ✅ | ❌ | ✅ | ❌ |
| Cobros y caja del día | ✅ | ❌ | ✅ | ❌ |
| Reportes financieros | ✅ | ❌ | ❌ | ❌ |
| Recordatorios automáticos | ✅ | 👁 | ✅ | 👁 |

**Regla de oro:** El peluquero nunca ve el historial clínico médico del paciente. El recepcionista nunca ve el detalle clínico (anamnesis, diagnóstico, tratamiento). Esta separación va a nivel de RLS en Supabase, no solo en UI.

---

## 6. Particularidades de Chile

Decisiones locales que todos los agentes deben respetar desde el día uno.

### 6.1 Facturación electrónica (SII)
- Usar terminología correcta: **boleta electrónica** (B2C) y **factura electrónica** (B2B).
- El cliente por defecto recibe boleta, salvo que pida factura con RUT de empresa.
- Campos obligatorios: RUT del cliente (para factura), folio, timbre SII.
- Integración con SII vía proveedor (ej: OpenFactura, Softland, Haulmer) — a definir en fase de facturación.

### 6.2 Receta retenida
- Algunos medicamentos veterinarios (psicotrópicos, ciertos antibióticos) requieren **receta retenida**.
- El sistema debe marcar la receta como "retenida" cuando el fármaco lo amerite y guardar copia.

### 6.3 SAG (Servicio Agrícola y Ganadero)
- Autoridad regulatoria relevante en Chile para medicamentos veterinarios y vacunas.
- A futuro: reportes obligatorios al SAG para ciertas actividades (fuera de alcance MVP).

### 6.4 Moneda y formato
- Moneda: **CLP** (peso chileno), sin decimales.
- Formato de fecha: `dd-mm-yyyy`.
- Idioma: español (Chile).

### 6.5 Identificación
- Cliente identificado por **RUT chileno** (con dígito verificador).
- Validación de RUT en el formulario de cliente.

---

## 7. Segmentación por tamaño de clínica

PraxisVet debe servir a 3 segmentos. El producto escala con el tamaño:

| Segmento | Equipo típico | Necesidad principal | Qué valora |
|---|---|---|---|
| **Vet solo** | 1 vet (hace todo) | Simplicidad extrema, rápido de aprender | Agenda + ficha + cobro básico |
| **Pequeña (2–4)** | 1–2 vets, 1 recep. | Coordinación del equipo | Agenda compartida, permisos básicos, inventario simple |
| **Mediana (5+)** | 3+ vets, recep., peluqueros, admin | Control del negocio y visibilidad | Reportes, roles estrictos, inventario avanzado, caja cuadrada |

**Implicancia de producto:** La UI debe ocultar complejidad al vet solo (ej: no mostrar módulos de "equipo"). Los planes de pricing deben alinearse a estos segmentos.

---

## 8. Fuera de alcance (MVP)

Lo siguiente **no** entra en la primera versión, para evitar scope creep:

- Integración directa SII (el MVP puede emitir documento en PDF y delegar emisión real a proveedor externo o manual).
- Telemedicina / consulta online.
- App móvil para clientes (self-service de citas).
- Multi-sucursal / multi-clínica.
- Laboratorio propio e imagenología integrada.
- Hospitalización y hoja de monitoreo 24h.
- Reportes al SAG.

Estas quedan en backlog. Si una decisión de producto las toca, hay que replantearla.

---

## 9. Cómo usar este documento

- **CoFounder**: valida que toda feature propuesta tenga sentido para al menos uno de los 3 segmentos y no rompa ninguno de los flujos E2E.
- **UXDesigner / UXWriter**: diseña pantallas y copy respetando qué rol las usa y qué puede ver.
- **Frontend**: componentes, rutas y menús se adaptan al rol actual del usuario.
- **Backend**: RLS en Supabase refleja la matriz de permisos de la sección 5, no la duplica en código de aplicación.
- **QA**: cada test de permiso valida explícitamente contra la matriz.

Si una decisión contradice este documento, primero se discute y se actualiza el doc, después se implementa. **Este doc es la fuente de verdad del dominio.**
