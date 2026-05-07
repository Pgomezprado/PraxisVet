/**
 * Smoke test: envía appt_confirmation_v1 directo a Kapso, sin pasar por Supabase.
 *
 * Si llega un WhatsApp a tu número, la cadena Kapso → Meta → tu phone funciona.
 * El siguiente paso es probar el dispatcher real (cita → log → Kapso).
 *
 * Uso:
 *   node scripts/test-send-template.mjs
 */

import { loadEnv } from "./lib/db-guard.mjs";

const env = loadEnv();
const apiKey = env.KAPSO_API_KEY;
const phoneNumberId = env.KAPSO_PHONE_NUMBER_ID;
const template = env.KAPSO_TPL_APPT_CONFIRMATION ?? "appt_confirmation_v1";
const to = (env.WHATSAPP_DRY_RUN_TO ?? "+56993589027").replace(/[^0-9]/g, "");

if (!apiKey || !phoneNumberId) {
  console.error("Faltan KAPSO_API_KEY o KAPSO_PHONE_NUMBER_ID");
  process.exit(1);
}

const url = `https://api.kapso.ai/meta/whatsapp/v24.0/${phoneNumberId}/messages`;

const variables = {
  tutor: "Pablo",
  pet: "Toto",
  clinic: "Clínica Demo",
  date: "08-05-2026",
  time: "10:30",
};

const body = {
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
};

console.log(`→ POST ${url}`);
console.log(`  to: ${to}`);
console.log(`  template: ${template}`);
console.log(`  variables:`, variables);

const res = await fetch(url, {
  method: "POST",
  headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const text = await res.text();
console.log(`\n← HTTP ${res.status}`);
console.log(text);

if (!res.ok) process.exit(1);
