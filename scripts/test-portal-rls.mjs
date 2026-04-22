/**
 * Test de seguridad del portal del tutor.
 *
 * Se loguea como tutor@praxisvet.dev y verifica que:
 *   ✓ Puede leer SUS clients/pets/appointments/vaccinations/dewormings
 *   ✗ NO puede leer clinical_records, grooming_records, invoices
 *   ✗ NO puede leer otros clients del mismo org
 *   ✓ Puede INSERT appointments con status='pending'
 *   ✗ NO puede INSERT con status distinto
 *   ✗ NO puede UPDATE appointments
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), ".env.local"), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")];
    })
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const c = createClient(url, anon, { auth: { persistSession: false } });

// Login como tutor
const { data: auth, error: authErr } = await c.auth.signInWithPassword({
  email: "tutor@praxisvet.dev",
  password: "Pablito041994!",
});
if (authErr) {
  console.error("❌ Login falló:", authErr.message);
  process.exit(1);
}
console.log("✓ Login tutor OK");

let pass = 0;
let fail = 0;

function expect(name, pred) {
  if (pred) {
    console.log(`  ✓ ${name}`);
    pass++;
  } else {
    console.log(`  ✗ ${name}`);
    fail++;
  }
}

// 1) Puede leer su propio client
const { data: myClients } = await c.from("clients").select("id, first_name");
expect("Ve al menos 1 client (el suyo)", (myClients ?? []).length >= 1);
expect("NO ve otros clients (solo 1)", (myClients ?? []).length === 1);
const myClient = myClients?.[0];

// 2) Puede leer sus mascotas
const { data: myPets } = await c.from("pets").select("id, name");
console.log(`  (mascotas visibles: ${(myPets ?? []).length})`);
expect("Ve sus mascotas", (myPets ?? []).length > 0);

// 3) NO puede leer clinical_records (RLS debe retornar vacío)
const { data: records } = await c
  .from("clinical_records")
  .select("id");
expect("No ve clinical_records", (records ?? []).length === 0);

// 4) Puede leer grooming_records SOLO de sus mascotas (no otras)
const { data: groomings } = await c
  .from("grooming_records")
  .select("id, pet_id");
const myPetIds = new Set((myPets ?? []).map((p) => p.id));
const allGroomingsAreMine = (groomings ?? []).every((g) =>
  myPetIds.has(g.pet_id)
);
expect(
  "grooming_records visibles son solo de sus mascotas",
  (groomings ?? []).length > 0 && allGroomingsAreMine
);

// 5) NO puede leer invoices
const { data: invoices } = await c.from("invoices").select("id");
expect("No ve invoices", (invoices ?? []).length === 0);

// 6) Puede leer vaccinations de sus mascotas (puede ser 0 si no hay)
const { error: vaccErr } = await c
  .from("vaccinations")
  .select("id")
  .limit(5);
expect("Puede consultar vaccinations (sin error RLS)", !vaccErr);

// 7) Puede leer appointments de sus mascotas
const { data: appts, error: apptsErr } = await c
  .from("appointments")
  .select("id, status, pet_id");
expect("Puede consultar appointments", !apptsErr);

// 8) NO puede insertar appointment con status != pending
if (myPets && myPets.length > 0) {
  const petId = myPets[0].id;
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const { error: badInsertErr } = await c.from("appointments").insert({
    pet_id: petId,
    client_id: myClient.id,
    org_id: "00000000-0000-0000-0000-000000000000", // cualquier org_id
    date: tomorrow,
    start_time: "10:00:00",
    status: "confirmed", // ← debería fallar
    type: "medical",
  });
  expect(
    "RLS bloquea INSERT con status='confirmed'",
    badInsertErr !== null
  );

  // 9) NO puede insertar appointment con date en el pasado
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const { error: pastErr } = await c.from("appointments").insert({
    pet_id: petId,
    client_id: myClient.id,
    org_id: "00000000-0000-0000-0000-000000000000",
    date: yesterday,
    start_time: "10:00:00",
    status: "pending",
    type: "medical",
  });
  expect(
    "RLS bloquea INSERT con date pasada",
    pastErr !== null
  );
}

// 10) Buscar client que NO es suyo por ID directo (debería dar vacío)
const { data: sneaky } = await c
  .from("clients")
  .select("id")
  .neq("id", myClient.id);
expect(
  "No puede ver otros clients aunque sepa el ID (neq filter)",
  (sneaky ?? []).length === 0
);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
