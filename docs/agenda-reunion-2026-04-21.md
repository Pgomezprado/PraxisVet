# Agenda reunión clínica fundadora — Martes 21 de abril de 2026

**Duración estimada:** 60 minutos
**Asistentes:** Pablo (PraxisVet) + dueña de clínica + equipo disponible (vet, recepcionista, peluquero si pueden)
**Formato:** Conversación mientras muestran el sistema que usan hoy. Grabar si es posible.

---

## Objetivos de la reunión

1. **Cerrar el vocabulario oficial** del producto (tema principal).
2. **Descubrir cómo emiten boletas hoy** para dimensionar la integración SII de v1.1.
3. **Recoger feedback rápido** de las últimas mejoras del MVP (ficha clínica ronda 2).
4. **Alinear próximos hitos** del piloto (los $80.000 CLP fijos empiezan cuando termine el trial de 2 meses).

---

## Bloque 1 · Vocabulario (30 min)

Seguir la guía existente: **[cuestionario-terminologia-clinica.md](cuestionario-terminologia-clinica.md)**

No repetir contenido acá. Tener el archivo abierto y marcar respuestas en vivo.

**Entregable al cierre:** lista definitiva de términos que se refleja en copy, formularios, PDFs y reportes.

---

## Bloque 2 · SII y facturación (15 min)

### 2.1 Contexto a entregar antes de preguntar (2 min)

Mensaje honesto (el copy público ya se ajustó hoy para reflejar esto):

> "Hoy PraxisVet genera **boleta y factura en PDF** con RUT del tutor, montos en CLP y receta retenida. La **emisión SII nativa** (folio y timbre electrónico) la estamos diseñando para v1.1 vía partner autorizado — probablemente OpenFactura o Haulmer. Antes de definirlo quiero entender cómo emiten boletas ustedes hoy."

### 2.2 Las 4 preguntas de descubrimiento (10 min)

Hacer las preguntas **mientras muestran el flujo real** si están en la clínica. No leer lista.

1. **¿Con qué emiten boletas hoy?**
   - Opciones posibles: portal SII mepymes (gratis), Bsale, Defontana, Nubox, Haulmer, Softland, Transbank + boleta manual, otro.
   - Anotar la marca literal.

2. **¿Quién las emite en la práctica?**
   - ¿Recepción justo después de cobrar? ¿Lo cierra el vet al final? ¿Lo sube el contador al día siguiente?
   - ¿Una persona distinta hace boletas B2C vs facturas B2B con RUT empresa?

3. **¿Cuánto tiempo al día se les va en eso?**
   - Tiempo por boleta (segundos/minutos).
   - ¿Hay doble digitación? (escribir RUT/glosa/monto dos veces en dos sistemas).
   - Pedir que muestren el paso a paso real con una boleta de hoy.

4. **¿Cuánto pagan hoy por ese software + costo por DTE emitido?**
   - Mensualidad.
   - Costo por folio/DTE si aplica.
   - ¿Tienen contrato anual o mes a mes?

### 2.3 Lectura de temperatura sobre los 3 niveles (3 min)

Presentar **solo si hay espacio** y la conversación lo pide:

| Nivel | Qué | Cuándo |
|---|---|---|
| **1 · Puente contable** | Botón "Exportar CSV" con RUT + monto + fecha + glosa + método de pago, listo para subir al sistema actual | Próximas 2 semanas (sin cargo extra) |
| **2 · SII nativo** | Emisión de boleta/factura desde la misma pantalla de cobro vía partner | v1.1 — junio/julio 2026 |
| **3 · Conciliación total** | Integración con Transbank/Flow + libro de ventas + IVA pre-llenado | v2.0 |

**Para la fundadora**: Nivel 2 **incluido sin cargo extra** cuando salga (parte del acuerdo fundador $80K congelado).

**NO prometer fecha exacta de Nivel 2** si no conocemos el proveedor aún.

---

## Bloque 3 · Feedback de las últimas mejoras (10 min)

Según memoria, ya hubo dos rondas de feedback sobre la ficha clínica (2026-04-15 SOAP/auscultación; 2026-04-19 contexto paciente, autoguardado, renombre a "Ficha", etc.).

Preguntar específicamente:

- ¿La **ficha** se siente más fluida que la versión anterior?
- ¿El **autoguardado** les da confianza o prefieren botón explícito?
- ¿Ya probaron el **filtro Mías/Todas** en /appointments? ¿Les ahorra pasos?
- ¿Algo de la **terminología es-CL** sonó raro en pantalla?

**NO abrir backlog nuevo acá.** Anotar y procesar después.

---

## Bloque 4 · Próximos hitos y acuerdo comercial (5 min)

Alinear expectativas:

- **Trial de 2 meses** empezó el 2026-04-15. Vence **2026-06-15**.
- Desde 2026-06-16 entran los **$80.000 CLP/mes congelados de por vida** (acuerdo fundador).
- **Próxima reunión**: idealmente en 2-3 semanas para cerrar Nivel 1 (exportación contable) y mostrar el cierre de caja UI si alcanzo a implementarlo.

Preguntar:

- ¿Qué es lo **único** que hoy les impide decirle adiós a su sistema actual?
- Si tuvieran que **recomendarlo mañana a otra clínica**, ¿qué dirían que funciona y qué dirían que falta?

---

## Preparación pre-reunión (hacer hoy)

- [x] Messaging SII ajustado en landing y tiers.ts
- [ ] Releer `project_clinical_form_ux_round2.md` para no repetir preguntas ya respondidas
- [ ] Tener abierto `cuestionario-terminologia-clinica.md` listo para marcar respuestas
- [ ] Preparar una **boleta/factura PDF de ejemplo** generada desde el sistema para mostrar si sale el tema SII
- [ ] Revisar rápidamente las tarifas públicas de OpenFactura y Haulmer (5 min en sus landings) — por si preguntan precio concreto, tener rango `$10-30 USD/clínica/mes`
- [ ] Confirmar asistencia al menos 2h antes

## Qué NO llevar a la mesa

- No prometer emisión SII nativa antes de hablar con el proveedor.
- No prometer integraciones con Transbank/Flow aún (Nivel 3 es lejano).
- No abrir el debate multi-sucursal ni telemedicina — fuera de MVP por política CoFounder.
- No bajar precios ni ofrecer descuentos adicionales — el acuerdo fundador ya está cerrado y es generoso.

## Post-reunión (mismo día)

- [ ] Transcribir respuestas de vocabulario al cuestionario
- [ ] Anotar el sistema de boletas actual en memoria (`project_clinic_reference.md` o nueva entrada)
- [ ] Crear plan "Nivel 1 — Exportación contable" si la conversación validó el dolor de doble digitación
- [ ] Actualizar `AGENTS.md` para reflejar estado real del código (document_type y cash_registers NO existen hoy)
