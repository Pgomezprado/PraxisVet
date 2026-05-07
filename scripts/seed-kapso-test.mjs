/**
 * Prepara la organización `clinica-demo` para probar WhatsApp Kapso end-to-end.
 *
 * Idempotente: se puede correr varias veces sin duplicar datos. Lo que hace:
 *   1. Activa los 4 flags de WhatsApp en clinica-demo.
 *   2. Asegura que existe un cliente "Pablo Test" con phone +56993589027,
 *      whatsapp_opt_in=true y un perro "Toto" para tener pet_id.
 *
 * No toca nada del seed-demo grande. Es solo el delta para Kapso.
 *
 * Uso:
 *   node scripts/seed-kapso-test.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { loadEnv, assertNotProd } from "./lib/db-guard.mjs";

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

assertNotProd(url, env, "seed-kapso-test");

const s = createClient(url, key, { auth: { persistSession: false } });

const ORG_SLUG = "clinica-demo";
const PHONE = "+56 9 9358 9027";
const PHONE_E164 = "+56993589027";
const FIRST_NAME = "Pablo";
const LAST_NAME = "Test";
const PET_NAME = "Toto";

async function die(msg, err) {
  console.error(`✗ ${msg}`, err?.message ?? err ?? "");
  process.exit(1);
}

async function main() {
  // 1) Org demo
  const { data: org, error: orgErr } = await s
    .from("organizations")
    .select("id, name")
    .eq("slug", ORG_SLUG)
    .single();
  if (orgErr || !org) await die(`Org "${ORG_SLUG}" no existe (corre seed-demo primero)`, orgErr);

  console.log(`✓ Org encontrada: ${org.name} (${org.id})`);

  // 2) Activar flags WhatsApp
  const { error: updOrgErr } = await s
    .from("organizations")
    .update({
      whatsapp_reminders_enabled: true,
      whatsapp_appt_confirmation_enabled: true,
      whatsapp_appt_reminder_24h_enabled: true,
      whatsapp_vaccine_reminder_enabled: true,
    })
    .eq("id", org.id);
  if (updOrgErr) await die("No pude activar flags WhatsApp", updOrgErr);
  console.log("✓ Flags WhatsApp activos en clinica-demo");

  // 3) Upsert cliente "Pablo Test" — buscar por phone_e164 (único de facto en la org).
  const { data: existing } = await s
    .from("clients")
    .select("id")
    .eq("org_id", org.id)
    .eq("phone_e164", PHONE_E164)
    .maybeSingle();

  let clientId = existing?.id ?? null;

  if (clientId) {
    const { error: updErr } = await s
      .from("clients")
      .update({
        first_name: FIRST_NAME,
        last_name: LAST_NAME,
        phone: PHONE,
        whatsapp_opt_in: true,
        whatsapp_opt_in_at: new Date().toISOString(),
        whatsapp_opt_in_source: "clinic_form",
      })
      .eq("id", clientId);
    if (updErr) await die("No pude actualizar cliente", updErr);
    console.log(`✓ Cliente actualizado: ${clientId}`);
  } else {
    const { data: created, error: insErr } = await s
      .from("clients")
      .insert({
        org_id: org.id,
        first_name: FIRST_NAME,
        last_name: LAST_NAME,
        phone: PHONE,
        whatsapp_opt_in: true,
        whatsapp_opt_in_at: new Date().toISOString(),
        whatsapp_opt_in_source: "clinic_form",
      })
      .select("id")
      .single();
    if (insErr || !created) await die("No pude crear cliente", insErr);
    clientId = created.id;
    console.log(`✓ Cliente creado: ${clientId}`);
  }

  // 4) Asegurar que el cliente tenga al menos una mascota
  const { data: pets } = await s
    .from("pets")
    .select("id, name")
    .eq("client_id", clientId)
    .limit(1);

  if (!pets || pets.length === 0) {
    const { data: pet, error: petErr } = await s
      .from("pets")
      .insert({
        org_id: org.id,
        client_id: clientId,
        name: PET_NAME,
        species: "canino",
      })
      .select("id, name")
      .single();
    if (petErr || !pet) await die("No pude crear mascota", petErr);
    console.log(`✓ Mascota creada: ${pet.name} (${pet.id})`);
  } else {
    console.log(`✓ Mascota existente: ${pets[0].name} (${pets[0].id})`);
  }

  console.log("\n✅ Listo. Ahora puedes:");
  console.log(`   1. Loguearte como admin de ${ORG_SLUG}`);
  console.log(`   2. Agendar una cita para "${FIRST_NAME} ${LAST_NAME}" / "${PET_NAME}"`);
  console.log(`   3. Cambiar status a "Confirmada"`);
  console.log(`   4. Esperar el WhatsApp en +56993589027`);
}

main().catch((err) => die("Error inesperado", err));
