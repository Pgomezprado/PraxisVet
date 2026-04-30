/**
 * Importador masivo de fichas históricas de peluquería desde Excel/Google Sheets.
 *
 * Lee un .xlsx con N hojas (una por mascota) o un .xlsx con bloques de fichas
 * y carga clients + pets + grooming_records en Supabase.
 *
 * Uso:
 *   node scripts/import-grooming-fichas.mjs --excel=./fichas-paws-hairs.xlsx \
 *        --org-slug=paws-hairs --env=dev --dry-run
 *
 *   node scripts/import-grooming-fichas.mjs --excel=./fichas-paws-hairs.xlsx \
 *        --org-slug=paws-hairs --env=dev
 *
 *   node scripts/import-grooming-fichas.mjs --excel=./fichas-paws-hairs.xlsx \
 *        --org-slug=paws-hairs --env=prod  # requiere confirmación interactiva
 *
 * Idempotente:
 *   - Cliente: match por (org_id, phone1) o (org_id, first_name+last_name)
 *   - Mascota: match por (org_id, client_id, name)
 *   - Grooming record: match por (org_id, pet_id, date, service_performed)
 *
 * Peluqueros:
 *   Si la ficha menciona un peluquero que no existe en organization_members,
 *   se crea con email placeholder `groomer-<slug>@<org-slug>.import` (sin auth user).
 *   Pablo debe invitarlos formalmente después vía UI.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { parseWorkbook } from "./lib/excel-grooming-parser.mjs";

// ---------- CLI args ----------
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    if (!m) return [a, true];
    return [m[1], m[2] ?? true];
  }),
);

const ENV_NAME = args.env || "dev";
const ORG_SLUG = args["org-slug"];
const EXCEL_PATH = args.excel;
const DRY_RUN = !!args["dry-run"];
const VERBOSE = !!args.verbose;

if (!ORG_SLUG || !EXCEL_PATH) {
  console.error("Uso: --excel=path.xlsx --org-slug=paws-hairs [--env=dev|prod] [--dry-run]");
  process.exit(1);
}

if (!existsSync(EXCEL_PATH)) {
  console.error(`No encuentro el archivo Excel: ${EXCEL_PATH}`);
  process.exit(1);
}

// ---------- Env loader (busca .env.local o .env.<env>) ----------
function loadEnv() {
  const candidates = [
    `.env.${ENV_NAME}.local`,
    `.env.${ENV_NAME}`,
    ".env.local",
    ".env",
  ];
  for (const file of candidates) {
    const path = resolve(process.cwd(), file);
    if (!existsSync(path)) continue;
    const env = Object.fromEntries(
      readFileSync(path, "utf8")
        .split("\n")
        .filter((l) => l && !l.startsWith("#") && l.includes("="))
        .map((l) => {
          const i = l.indexOf("=");
          return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")];
        }),
    );
    if (env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log(`✓ Cargando credenciales desde ${file}`);
      return env;
    }
  }
  console.error("No encontré NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY en ningún .env*");
  process.exit(1);
}

const env = loadEnv();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ---------- Confirmación para prod ----------
async function confirmProd() {
  if (ENV_NAME !== "prod" || DRY_RUN) return;
  const rl = createInterface({ input, output });
  const answer = await rl.question(
    `\n⚠️  Vas a IMPORTAR a PRODUCCIÓN (${env.NEXT_PUBLIC_SUPABASE_URL}).\n` +
      `Org slug: ${ORG_SLUG}\nArchivo: ${EXCEL_PATH}\n\nEscribe "IMPORTAR PROD" para continuar: `,
  );
  rl.close();
  if (answer.trim() !== "IMPORTAR PROD") {
    console.log("Abortado.");
    process.exit(0);
  }
}

// ---------- Helpers ----------
function die(msg, err) {
  console.error("❌", msg, err ? JSON.stringify(err, null, 2) : "");
  process.exit(1);
}

function slugify(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function log(...a) {
  if (VERBOSE) console.log(...a);
}

// ---------- Cargar XLSX (lazy import) ----------
let XLSX;
try {
  XLSX = (await import("xlsx")).default ?? (await import("xlsx"));
} catch (err) {
  console.error(
    "Falta la dependencia 'xlsx'. Instálala con:\n  npm install --save-dev xlsx\n",
  );
  process.exit(1);
}

// ---------- Resolver org ----------
async function resolveOrg() {
  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", ORG_SLUG)
    .maybeSingle();
  if (error) die("query organizations", error);
  if (!data) die(`Org "${ORG_SLUG}" no existe. Crea la organización primero (signup o seed).`);
  console.log(`✓ Org: ${data.name} (${data.id})`);
  return data;
}

// ---------- Lookup / crear groomer por nombre ----------
const groomerCache = new Map(); // key: normalized name → org_member id

async function ensureGroomer(orgId, nameRaw) {
  if (!nameRaw) return null;
  const name = String(nameRaw).trim();
  if (!name) return null;
  const key = name.toLowerCase();
  if (groomerCache.has(key)) return groomerCache.get(key);

  const parts = name.split(/\s+/);
  const firstName = parts[0];
  const lastName = parts.slice(1).join(" ") || "";

  const { data: existing, error: searchErr } = await supabase
    .from("organization_members")
    .select("id, first_name, last_name, role")
    .eq("org_id", orgId)
    .eq("role", "groomer")
    .ilike("first_name", firstName);
  if (searchErr) die("search groomer", searchErr);

  if (existing && existing.length > 0) {
    const id = existing[0].id;
    groomerCache.set(key, id);
    return id;
  }

  if (DRY_RUN) {
    console.log(`  [dry-run] Crearía groomer "${name}"`);
    groomerCache.set(key, "DRY_RUN_GROOMER");
    return "DRY_RUN_GROOMER";
  }

  const placeholder = `groomer-${slugify(name)}@${ORG_SLUG}.import`;
  const { data: created, error: createErr } = await supabase
    .from("organization_members")
    .insert({
      org_id: orgId,
      user_id: null,
      role: "groomer",
      first_name: firstName,
      last_name: lastName,
      specialty: null,
      active: true,
    })
    .select("id")
    .single();
  if (createErr) {
    console.warn(`  ⚠ no pude crear groomer "${name}": ${createErr.message}`);
    return null;
  }
  console.log(`  + groomer creado: ${name} (${placeholder})`);
  groomerCache.set(key, created.id);
  return created.id;
}

// ---------- Upsert client ----------
async function upsertClient(orgId, ficha) {
  const phoneFilter = ficha.header.phone1 || ficha.header.phone2;
  let existingId = null;

  if (phoneFilter) {
    const { data, error } = await supabase
      .from("clients")
      .select("id, first_name, last_name, phone")
      .eq("org_id", orgId)
      .eq("phone", phoneFilter)
      .maybeSingle();
    if (error && error.code !== "PGRST116") die("query client by phone", error);
    if (data) existingId = data.id;
  }

  if (!existingId) {
    const { data, error } = await supabase
      .from("clients")
      .select("id")
      .eq("org_id", orgId)
      .eq("first_name", ficha.header.owner_first_name)
      .eq("last_name", ficha.header.owner_last_name)
      .maybeSingle();
    if (error && error.code !== "PGRST116") die("query client by name", error);
    if (data) existingId = data.id;
  }

  if (existingId) return { id: existingId, created: false };

  if (DRY_RUN) return { id: "DRY_RUN_CLIENT", created: true };

  const notesParts = [];
  if (ficha.header.phone2 && ficha.header.phone1) {
    notesParts.push(`Teléfono 2: ${ficha.header.phone2}`);
  }

  const { data, error } = await supabase
    .from("clients")
    .insert({
      org_id: orgId,
      first_name: ficha.header.owner_first_name,
      last_name: ficha.header.owner_last_name,
      phone: ficha.header.phone1 || ficha.header.phone2 || null,
      notes: notesParts.length ? notesParts.join("\n") : null,
    })
    .select("id")
    .single();
  if (error) die(`insert client (${ficha.header.owner_first_name})`, error);
  return { id: data.id, created: true };
}

// ---------- Upsert pet ----------
async function upsertPet(orgId, clientId, ficha) {
  if (clientId === "DRY_RUN_CLIENT") return { id: "DRY_RUN_PET", created: true };

  const { data: existing, error: searchErr } = await supabase
    .from("pets")
    .select("id, name")
    .eq("org_id", orgId)
    .eq("client_id", clientId)
    .ilike("name", ficha.header.pet_name)
    .maybeSingle();
  if (searchErr && searchErr.code !== "PGRST116") die("query pet", searchErr);
  if (existing) return { id: existing.id, created: false };

  if (DRY_RUN) return { id: "DRY_RUN_PET", created: true };

  const { data, error } = await supabase
    .from("pets")
    .insert({
      org_id: orgId,
      client_id: clientId,
      name: ficha.header.pet_name,
      species: ficha.header.species,
      breed: ficha.header.breed,
      sex: ficha.header.sex,
      active: true,
    })
    .select("id")
    .single();
  if (error) die(`insert pet (${ficha.header.pet_name})`, error);
  return { id: data.id, created: true };
}

// ---------- Insertar grooming records ----------
async function insertGroomingRecords(orgId, petId, visits) {
  if (!visits.length) return { inserted: 0, skipped: 0 };
  if (petId === "DRY_RUN_PET") return { inserted: visits.length, skipped: 0 };

  const { data: existing, error: existingErr } = await supabase
    .from("grooming_records")
    .select("date, service_performed")
    .eq("org_id", orgId)
    .eq("pet_id", petId);
  if (existingErr) die("query existing grooming_records", existingErr);

  const seen = new Set(
    (existing || []).map((r) => `${r.date}|${(r.service_performed || "").trim().toLowerCase()}`),
  );

  const toInsert = [];
  let skipped = 0;
  for (const v of visits) {
    const groomerId = await ensureGroomer(orgId, v.groomer_name);
    const servicePerformed = [v.service, v.detail].filter(Boolean).map((x) => String(x).trim()).join(" — ") || null;
    const key = `${v.date}|${(servicePerformed || "").trim().toLowerCase()}`;
    if (seen.has(key)) {
      skipped++;
      continue;
    }
    seen.add(key);
    const observations = [
      v.observations ? String(v.observations).trim() : null,
      v.amount != null ? `Valor: $${v.amount.toLocaleString("es-CL")}` : null,
    ].filter(Boolean).join(" · ") || null;

    toInsert.push({
      org_id: orgId,
      pet_id: petId,
      groomer_id: groomerId === "DRY_RUN_GROOMER" ? null : groomerId,
      appointment_id: null,
      date: v.date,
      service_performed: servicePerformed,
      observations,
      products_used: null,
    });
  }

  if (DRY_RUN) return { inserted: toInsert.length, skipped };

  const BATCH = 200;
  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += BATCH) {
    const chunk = toInsert.slice(i, i + BATCH);
    const { error } = await supabase.from("grooming_records").insert(chunk);
    if (error) die(`insert grooming_records batch ${i}`, error);
    inserted += chunk.length;
  }
  return { inserted, skipped };
}

// ---------- Main ----------
await confirmProd();

console.log(`\n📂 Leyendo Excel: ${EXCEL_PATH}`);
const buf = readFileSync(EXCEL_PATH);
const workbook = XLSX.read(buf, { type: "buffer", cellDates: true });
console.log(`   ${workbook.SheetNames.length} hojas detectadas`);

const { fichas, skipped: skippedSheets } = parseWorkbook(workbook, XLSX);
console.log(`   ${fichas.length} fichas válidas, ${skippedSheets.length} hojas omitidas`);
if (skippedSheets.length && VERBOSE) {
  console.log("   Hojas omitidas:");
  for (const s of skippedSheets) console.log(`     - ${s.sheet_name}: ${s.reason}`);
}

if (!fichas.length) {
  console.error("\nNo se detectó ninguna ficha válida. Revisar estructura del Excel.");
  process.exit(1);
}

// Muestra de las primeras 3 fichas para validar parsing
console.log("\n🔍 Muestra de las primeras 3 fichas parseadas:");
for (const f of fichas.slice(0, 3)) {
  console.log(`\n  Hoja "${f.sheet_name}":`);
  console.log(`    Mascota: ${f.header.pet_name} (${f.header.species}, raza: ${f.header.breed || "—"}, sexo: ${f.header.sex || "—"})`);
  console.log(`    Dueño: ${f.header.owner_first_name} ${f.header.owner_last_name}`);
  console.log(`    Tel: ${f.header.phone1 || "—"} / ${f.header.phone2 || "—"}`);
  console.log(`    Visitas: ${f.visits.length}`);
  for (const v of f.visits.slice(0, 2)) {
    console.log(`      · ${v.date} | ${v.service || "—"} | $${v.amount?.toLocaleString("es-CL") || "—"} | ${v.groomer_name || "—"}`);
  }
}

const org = await resolveOrg();

const stats = {
  fichas: 0,
  clients_created: 0,
  clients_existing: 0,
  pets_created: 0,
  pets_existing: 0,
  grooming_inserted: 0,
  grooming_skipped: 0,
  groomers_created: 0,
};

console.log(`\n${DRY_RUN ? "🧪 DRY-RUN" : "🚀 IMPORTANDO"} (${ENV_NAME})…\n`);

for (const ficha of fichas) {
  stats.fichas++;
  const client = await upsertClient(org.id, ficha);
  if (client.created) stats.clients_created++;
  else stats.clients_existing++;

  const pet = await upsertPet(org.id, client.id, ficha);
  if (pet.created) stats.pets_created++;
  else stats.pets_existing++;

  const groom = await insertGroomingRecords(org.id, pet.id, ficha.visits);
  stats.grooming_inserted += groom.inserted;
  stats.grooming_skipped += groom.skipped;

  if (VERBOSE) {
    console.log(
      `  ${ficha.header.pet_name} → client:${client.created ? "+" : "="} pet:${pet.created ? "+" : "="} grooming:+${groom.inserted}/-${groom.skipped}`,
    );
  }
}

stats.groomers_created = Array.from(groomerCache.values()).filter(
  (id) => id && id !== "DRY_RUN_GROOMER",
).length;

console.log("\n📊 Resumen:");
console.log(`   Fichas procesadas:    ${stats.fichas}`);
console.log(`   Clientes (nuevos):    ${stats.clients_created}`);
console.log(`   Clientes (existentes):${stats.clients_existing}`);
console.log(`   Mascotas (nuevas):    ${stats.pets_created}`);
console.log(`   Mascotas (existentes):${stats.pets_existing}`);
console.log(`   Grooming records (+): ${stats.grooming_inserted}`);
console.log(`   Grooming dup. (skip): ${stats.grooming_skipped}`);
console.log(`   Peluqueros referenced:${groomerCache.size}`);

if (DRY_RUN) {
  console.log("\n⚠️  DRY-RUN: nada se escribió en la base de datos.");
} else {
  console.log("\n✅ Import completado.");
}
