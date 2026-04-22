# Script de demo — Reunión clínica fundadora (2026-04-21)

**Objetivo del bloque:** en 10 minutos, mostrar las 3 funcionalidades nuevas sin entrar en detalles técnicos. Una frase de contexto por feature, demo rápida, pregunta abierta.

**Antes de la reunión:**

- [ ] `npm run dev` corriendo en localhost:3000
- [ ] `node scripts/seed-demo.mjs` ejecutado (datos frescos)
- [ ] Navegador en modo incógnito (sin sesión previa)
- [ ] Tener abierta una segunda pestaña con Gmail si piensas mostrar el email del tutor

**Credenciales demo:**

| Rol | Email | Password |
|---|---|---|
| Admin | admin@praxisvet.dev | Pablito041994! |
| Veterinaria | vet@praxisvet.dev | Pablito041994! |
| Recepcionista | recep@praxisvet.dev | Pablito041994! |
| Peluquero | groomer@praxisvet.dev | Pablito041994! |
| **Tutor (nuevo)** | tutor@praxisvet.dev | Pablito041994! |

URL base: `http://localhost:3000` · Clínica demo slug: `clinica-demo`

---

## 1 · Analytics del admin (3 min)

**Contexto al abrir:**
> "Una de las cosas que notamos que les faltaba era tener una vista ejecutiva. Antes veían números sueltos en el dashboard; ahora tienen un panel con gráficos."

**Pasos:**

1. Login como **admin**.
2. Click en **"Analytics"** en el sidebar (solo visible para admin).
3. Mostrar en orden:
   - **Ingresos cobrados** — línea con comparación año anterior. Destacar el % de delta.
   - **Citas y asistencia** — KPIs (agendadas / realizadas / no-show) + barras apiladas. Tasa de asistencia coloreada (verde ≥85%, amarillo ≥70%, rojo <70%).
   - **Top servicios y productos** — ranking por ingresos.
   - **Productividad por profesional** — tabla con ingresos, citas e índice de asistencia de cada vet/peluquero.
4. Cambiar filtro a **"Últimos 12 meses"** para mostrar que funciona.

**Preguntas abiertas:**
- ¿Qué métricas faltarían para tomar decisiones la primera semana del mes?
- ¿Lo verían a diario o semanal?

---

## 2 · Recordatorios por WhatsApp (2 min)

**Contexto al abrir:**
> "Uno de los dolores del análisis competitivo fue el no-show. Los competidores tienen WhatsApp automático. Les preparé la base: el código está listo, me falta solo que Meta apruebe los templates oficiales — eso toma entre 1 y 3 días. Les muestro cómo queda."

**Pasos:**

1. Seguir como **admin**. Ir a **Configuración → Notificaciones**.
2. Mostrar el panel con:
   - Toggle principal "Enviar recordatorios automáticos por WhatsApp" (hoy desactivado, aviso de que el provider no está conectado).
   - KPIs: clientes con teléfono válido / clientes que aceptaron recibir.
   - Guía de cómo funciona.
3. Ir a un cliente cualquiera (ej. Ana Muñoz) → **Editar**.
4. Mostrar que si el teléfono no tiene formato chileno, Zod lo rechaza. Escribir `+56 9 1234 5678` y mostrar que aparece el toggle **"Recibir recordatorios por WhatsApp"** (default ON).

**Mensaje a la veterinaria:**
> "Cuando tengan el piloto andando, pueden activar el toggle global y cada cliente elige si recibe o no desde su ficha. El mensaje es una plantilla aprobada por Meta — no podemos cambiar el texto, pero sí puedo elegir qué variables (nombre, mascota, hora, etc.) irán."

**Pregunta:**
- ¿Qué texto les gustaría que diga el recordatorio?
- ¿Cuántas horas antes debería llegar? Hoy está puesto 24h antes.

---

## 3 · Portal del tutor (5 min — el plato fuerte)

**Contexto al abrir:**
> "Esta es probablemente la feature que más valor agrega. El dueño de la mascota entra con su email, sin contraseña, y ve sus mascotas, vacunas, desparasitaciones y peluquería. Pueden solicitar cita sin llamar por teléfono."

**Pasos (parte A — cómo se invita):**

1. Seguir logueado como **admin**.
2. Ir a **Clientes → Ana Muñoz** (el tutor demo ya está vinculado, pero mostrar el flujo).
3. Mostrar el card "Portal del tutor" — en el demo aparece con badge **"Activo"**. Explicar:
   - Botón **Invitar al portal** → envía magic link al email del cliente.
   - Cliente hace click → entra sin crear contraseña.
   - Admin puede **Reenviar** o **Revocar** en cualquier momento.
4. Mostrar que el botón solo está habilitado si el cliente tiene email.

**Pasos (parte B — qué ve el tutor):**

1. Abrir **ventana incógnito** para no perder la sesión admin.
2. Login como **tutor@praxisvet.dev** / Pablito041994!
3. Aterriza directo en `/tutor/clinica-demo`. Mostrar:
   - Header minimalista (solo nombre clínica + nombre tutor + logout, sin sidebar interno).
   - **Próximas citas** con estado (Por confirmar / Confirmada).
   - **Mis mascotas** — cards clickeables de Firulais y Coco.
4. Click en **Firulais** → detalle con:
   - **Vacunas** (historial)
   - **Desparasitaciones** (historial)
   - **Peluquería** (fecha, servicio, quién atendió, costo en CLP, observaciones)
   - **Historial de citas**
5. Volver al home → click en **"Solicitar cita"**.
6. Llenar el diálogo (mascota, fecha futura, hora, motivo). Enviar.
7. Volver a la pestaña incógnito como admin → mostrar que la cita aparece como **pendiente** en la agenda.

**Qué NO ve el tutor (remarcar):**
> "Importante: el tutor nunca ve la ficha clínica completa, ni el diagnóstico del vet, ni los montos de facturas internos. Eso queda cerrado por la base de datos, no solo por UI."

**Preguntas:**
- ¿Ven al tutor usando esto desde el celular camino al trabajo? ¿Qué le falta?
- ¿Prefieren que "Solicitar cita" quede como pendiente (hoy) o que directamente agende y la clínica confirme?
- ¿Debería poder cancelar una cita desde ahí, o es mejor que llame?
- ¿Mostrarían el monto de peluquería o prefieren dejar el precio fuera de la vista del tutor?

---

## Cierre del bloque (1 min)

> "Son 3 funcionalidades respondiendo a 3 dolores distintos. Me interesa entender cuál de las 3 les resolvería un problema más grande esta semana, para saber si el orden de prioridad tiene sentido."

**Anotar:**

- [ ] Ranking de las 3 por importancia según ellas
- [ ] Feature que NO les sirve (si hay)
- [ ] Ajuste de copy/vocabulario detectado en vivo (pasa al cuestionario de vocabulario)

---

## Riesgos si algo falla en vivo

- **Localhost caído**: tener screenshots de respaldo de cada pantalla en el celular.
- **Seed borrado**: `node scripts/seed-demo.mjs` lo regenera en 30s.
- **Tutor no entra al portal**: confirmar que `client_auth_links` tiene `linked_at NOT NULL` para ese user. El seed lo deja así.
- **WhatsApp pregunta "cuándo estará operativo"**: respuesta honesta — 24-72h desde que se someten los templates a Meta, que haré esta semana.

## Pendiente mío (NO abrir en reunión salvo que pregunten)

Código completo, falta:
1. Crear cuenta Twilio + comprar número WhatsApp Business.
2. Someter 3 templates a Meta.
3. Configurar env vars en Vercel.
4. Verificar plan Vercel (Hobby permite 2 crons máximo, ya estoy en el límite con trial + appointments).
