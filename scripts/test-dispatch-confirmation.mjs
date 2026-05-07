/**
 * Crea una cita de prueba en clinica-demo y dispara el flujo de confirmación
 * replicando exactamente lo que hace lib/notifications/whatsapp.ts
 * (sendAppointmentConfirmation), para probar la cadena completa sin pasar
 * por la UI.
 *
 * Hace TODOS los guards: org flags, opt-in, phone_e164, pet, template.
 * Inserta notification_logs con status queued -> sent/failed.
 *
 * Uso:
 *   node scripts/test-dispatch-confirmation.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { loadEnv, assertNotProd } from "./lib/db-guard.mjs";

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const srk = env.SUPABASE_SERVICE_ROLE_KEY;
assertNotProd(url, env, "test-dispatch-confirmation");

const apiKey = env.KAPSO_API_KEY;
const phoneNumberId = env.KAPSO_PHONE_NUMBER_ID;
const template = env.KAPSO_TPL_APPT_CONFIRMATION ?? "appt_confirmation_v1";

if (!url || !srk || !apiKey || !phoneNumberId) {
  console.error("Faltan envs Supabase o Kapso");
  process.exit(1);
}

const s = createClient(url, srk, { auth: { persistSession: false } });

// 1) Buscar org demo
const { data: org } = await s
  .from("organizations")
  .select("id, name, whatsapp_reminders_enabled, whatsapp_appt_confirmation_enabled")
  .eq("slug", "clinica-demo")
  .single();
console.log("ORG flags:", {
  reminders: org?.whatsapp_reminders_enabled,
  confirmation: org?.whatsapp_appt_confirmation_enabled,
});

// 2) Cliente test
const { data: client } = await s
  .from("clients")
  .select("id, first_name, phone_e164, whatsapp_opt_in")
  .eq("org_id", org.id)
  .eq("phone_e164", "+56993589027")
  .limit(1)
  .single();
console.log("CLIENT opt-in:", client?.whatsapp_opt_in, "phone present:", !!client?.phone_e164);

// 3) Mascota Toto
const { data: pet } = await s
  .from("pets")
  .select("id, name")
  .eq("client_id", client.id)
  .eq("name", "Toto")
  .limit(1)
  .single();
console.log("PET:", pet?.name);

// 4) Buscar un assigned_to válido (cualquier vet de la org)
const { data: vet } = await s
  .from("organization_members")
  .select("id, user_id")
  .eq("org_id", org.id)
  .eq("role", "vet")
  .limit(1)
  .single();
if (!vet) {
  console.error("No hay vet en la org");
  process.exit(1);
}

// 5) Crear cita confirmada para mañana 11:00
const tomorrow = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);
const { data: appt, error: insErr } = await s
  .from("appointments")
  .insert({
    org_id: org.id,
    client_id: client.id,
    pet_id: pet.id,
    assigned_to: vet.id,
    type: "medical",
    status: "confirmed",
    date: tomorrow,
    start_time: "15:30",
    end_time: "16:00",
    reason: "Smoke test WhatsApp",
  })
  .select()
  .single();
if (insErr) {
  console.error("Error creando cita:", insErr.message);
  process.exit(1);
}
console.log("✅ Cita creada:", appt.id, appt.date, appt.start_time);

// 6) Réplica del dispatcher: variables, log, envío
function fmtDate(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
}
function fmtTime(t) {
  return t.slice(0, 5);
}
const variables = {
  tutor: client.first_name,
  pet: pet.name,
  clinic: org.name,
  date: fmtDate(appt.date),
  time: fmtTime(appt.start_time),
};
console.log("VARIABLES:", variables);

const { data: log } = await s
  .from("notification_logs")
  .insert({
    org_id: org.id,
    client_id: client.id,
    pet_id: pet.id,
    appointment_id: appt.id,
    channel: "whatsapp",
    provider: "kapso",
    template,
    status: "queued",
    direction: "outbound",
    phone_e164: client.phone_e164,
    payload: { variables },
  })
  .select("id")
  .single();
console.log("📥 Log queued:", log?.id);

const to = (env.WHATSAPP_DRY_RUN_TO ?? client.phone_e164).replace(/[^0-9]/g, "");
const kapsoUrl = `https://api.kapso.ai/meta/whatsapp/v24.0/${phoneNumberId}/messages`;
const res = await fetch(kapsoUrl, {
  method: "POST",
  headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
  body: JSON.stringify({
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: template,
      language: { code: "es" },
      components: [
        {
          type: "body",
          parameters: Object.entries(variables).map(([parameter_name, text]) => ({
            type: "text",
            parameter_name,
            text,
          })),
        },
      ],
    },
  }),
});
const body = await res.json().catch(() => null);
console.log("KAPSO HTTP", res.status, body);

const messageId = body?.messages?.[0]?.id;
if (res.ok && messageId) {
  await s
    .from("notification_logs")
    .update({ status: "sent", provider_message_id: messageId, updated_at: new Date().toISOString() })
    .eq("id", log.id);
  console.log("✅ Log marked as sent");
} else {
  await s
    .from("notification_logs")
    .update({ status: "failed", error_message: JSON.stringify(body), updated_at: new Date().toISOString() })
    .eq("id", log.id);
  console.log("❌ Log marked as failed");
}
