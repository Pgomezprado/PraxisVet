/**
 * Seed de demo para PraxisVet — Clinica Demo.
 *
 * Crea:
 *   - 4 auth users (admin, vet, receptionist, groomer) vinculados a organization_members
 *   - Clientes con mascotas
 *   - Servicios (médicos + peluquería)
 *   - Citas de HOY con estados variados y mezcla medical/grooming
 *   - Facturas: 1 pagada hoy, 2 pendientes, 1 vencida
 *   - Productos + stock (uno por debajo del mínimo)
 *
 * Idempotente en lo que puede: upsert por email de miembro; resto limpia + reinserta.
 * Password universal: Pablito041994!
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), ".env.local"), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")];
    }),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

const s = createClient(url, key, { auth: { persistSession: false } });

const PASSWORD = "Pablito041994!";
const ORG_SLUG = "clinica-demo";

const TODAY = new Date().toISOString().split("T")[0];
const YESTERDAY = new Date(Date.now() - 86400000).toISOString().split("T")[0];
const LAST_WEEK = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------
async function die(msg, err) {
  console.error("❌", msg, err ?? "");
  process.exit(1);
}

async function ensureAuthUser(email) {
  // Busca en la lista; si no existe, lo crea
  const { data: list, error: listErr } = await s.auth.admin.listUsers();
  if (listErr) die("listUsers", listErr);
  const existing = list.users.find((u) => u.email === email);
  if (existing) return existing.id;

  const { data, error } = await s.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) die(`createUser ${email}`, error);
  return data.user.id;
}

// ---------------------------------------------------------------
// 0) Seed del catálogo global de vacunas (idempotente, requiere SUPABASE_DB_URL)
// ---------------------------------------------------------------
const dbUrl = env.SUPABASE_DB_URL || env.DATABASE_URL || process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
if (dbUrl) {
  const res = spawnSync(
    "node",
    ["scripts/apply-sql.mjs", "supabase/seed/vaccines_catalog.sql"],
    { stdio: "inherit", env: { ...process.env, SUPABASE_DB_URL: dbUrl } },
  );
  if (res.status !== 0) die("seed vaccines_catalog falló");
  console.log("✓ Catálogo global de vacunas seedeado");
} else {
  console.warn(
    "⚠ SUPABASE_DB_URL no configurado — omitiendo seed de vaccines_catalog. " +
    "Corre manualmente en Supabase SQL Editor: supabase/seed/vaccines_catalog.sql",
  );
}

// ---------------------------------------------------------------
// 1) Organización
// ---------------------------------------------------------------
const { data: org, error: orgErr } = await s
  .from("organizations")
  .select("id, name, slug")
  .eq("slug", ORG_SLUG)
  .single();
if (orgErr || !org) die(`Org "${ORG_SLUG}" no encontrada. Corre primero scripts/seed-dev.mjs`);
console.log("✓ Org:", org.name, org.id);

// ---------------------------------------------------------------
// 2) Miembros del equipo con login
// ---------------------------------------------------------------
const members = [
  {
    email: "admin@praxisvet.dev",
    role: "admin",
    first_name: "Pablo",
    last_name: "Gomez",
    specialty: null,
  },
  {
    email: "vet@praxisvet.dev",
    role: "vet",
    first_name: "María",
    last_name: "González",
    specialty: "Medicina felina",
  },
  {
    email: "recep@praxisvet.dev",
    role: "receptionist",
    first_name: "Camila",
    last_name: "Rojas",
    specialty: null,
  },
  {
    email: "groomer@praxisvet.dev",
    role: "groomer",
    first_name: "Diego",
    last_name: "Pérez",
    specialty: "Peluquería canina",
  },
];

const memberIds = {};
for (const m of members) {
  const userId = await ensureAuthUser(m.email);

  // ¿Ya existe el membership?
  const { data: existing } = await s
    .from("organization_members")
    .select("id")
    .eq("org_id", org.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    await s
      .from("organization_members")
      .update({
        role: m.role,
        first_name: m.first_name,
        last_name: m.last_name,
        specialty: m.specialty,
        active: true,
      })
      .eq("id", existing.id);
    memberIds[m.role] = existing.id;
  } else {
    const { data, error } = await s
      .from("organization_members")
      .insert({
        org_id: org.id,
        user_id: userId,
        role: m.role,
        first_name: m.first_name,
        last_name: m.last_name,
        specialty: m.specialty,
        active: true,
      })
      .select("id")
      .single();
    if (error) die(`insert member ${m.role}`, error);
    memberIds[m.role] = data.id;
  }
  console.log(`✓ Member ${m.role}: ${m.email}`);
}

// ---------------------------------------------------------------
// 3) Clean slate — borra datos demo previos (respetando FKs)
// ---------------------------------------------------------------
async function wipeTable(table, filter = { org_id: org.id }) {
  const key = Object.keys(filter)[0];
  const value = filter[key];
  const { error } = await s.from(table).delete().eq(key, value);
  if (error && !/does not exist|no rows/i.test(error.message)) {
    console.warn(`  ⚠️  wipe ${table}:`, error.message);
  }
}

console.log("⟳ Limpiando datos demo previos…");
await wipeTable("grooming_records");
await wipeTable("invoices");
await wipeTable("appointments");
await wipeTable("pets");
await wipeTable("clients");
await wipeTable("stock");
await wipeTable("products");
await wipeTable("services");

// ---------------------------------------------------------------
// 4) Servicios
// ---------------------------------------------------------------
const { data: services, error: svcErr } = await s
  .from("services")
  .insert([
    { org_id: org.id, name: "Consulta general", category: "consultation", duration_minutes: 30, price: 25000, active: true },
    { org_id: org.id, name: "Vacuna séxtuple", category: "vaccine", duration_minutes: 15, price: 18000, active: true },
    { org_id: org.id, name: "Cirugía menor", category: "surgery", duration_minutes: 90, price: 120000, active: true },
    { org_id: org.id, name: "Baño completo", category: "grooming", duration_minutes: 45, price: 15000, active: true },
    { org_id: org.id, name: "Corte de pelo", category: "grooming", duration_minutes: 60, price: 22000, active: true },
  ])
  .select("id, name, category");
if (svcErr) die("services", svcErr);
const svc = Object.fromEntries(services.map((x) => [x.name, x]));
console.log("✓ Services:", services.length);

// ---------------------------------------------------------------
// 5) Clientes + mascotas
// ---------------------------------------------------------------
const { data: clients, error: clientsErr } = await s
  .from("clients")
  .insert([
    { org_id: org.id, first_name: "Ana", last_name: "Muñoz", rut: "12.345.678-9", email: "ana@example.cl", phone: "+56911111111" },
    { org_id: org.id, first_name: "Javier", last_name: "Castro", rut: "13.456.789-0", email: "javier@example.cl", phone: "+56922222222" },
    { org_id: org.id, first_name: "Sofía", last_name: "Vega", rut: "14.567.890-1", email: "sofia@example.cl", phone: "+56933333333" },
    { org_id: org.id, first_name: "Martín", last_name: "Silva", rut: "15.678.901-2", email: "martin@example.cl", phone: "+56944444444" },
    { org_id: org.id, first_name: "Paula", last_name: "Reyes", rut: "16.789.012-3", email: "paula@example.cl", phone: "+56955555555" },
  ])
  .select("id, first_name, last_name");
if (clientsErr) die("clients", clientsErr);
console.log("✓ Clients:", clients.length);

const petsPayload = [
  { client: clients[0], name: "Firulais", species: "canino", breed: "Labrador" },
  { client: clients[1], name: "Luna", species: "felino", breed: "Siamés" },
  { client: clients[2], name: "Rocky", species: "canino", breed: "Bulldog" },
  { client: clients[3], name: "Toby", species: "canino", breed: "Golden Retriever" },
  { client: clients[4], name: "Mia", species: "felino", breed: "Persa" },
  { client: clients[0], name: "Coco", species: "canino", breed: "Poodle" },
];

const { data: pets, error: petsErr } = await s
  .from("pets")
  .insert(
    petsPayload.map((p) => ({
      org_id: org.id,
      client_id: p.client.id,
      name: p.name,
      species: p.species,
      breed: p.breed,
      active: true,
    }))
  )
  .select("id, name, client_id");
if (petsErr) die("pets", petsErr);
console.log("✓ Pets:", pets.length);

const petByName = Object.fromEntries(pets.map((p) => [p.name, p]));

// ---------------------------------------------------------------
// 6) Citas de HOY — mix de tipos, estados, asignados
// ---------------------------------------------------------------
function apt(pet, time, endTime, status, type, assignedToRole, service, reason) {
  return {
    org_id: org.id,
    client_id: pet.client_id,
    pet_id: pet.id,
    assigned_to: memberIds[assignedToRole],
    service_id: service?.id ?? null,
    date: TODAY,
    start_time: time,
    end_time: endTime,
    status,
    type,
    reason,
  };
}

const appointments = [
  // Vet (María) - medicinas
  apt(petByName.Firulais, "08:30:00", "09:00:00", "completed", "medical", "vet", svc["Consulta general"], "Control general"),
  apt(petByName.Luna, "09:30:00", "10:00:00", "in_progress", "medical", "vet", svc["Consulta general"], "Revisa ojos rojos"),
  apt(petByName.Rocky, "11:00:00", "11:15:00", "confirmed", "medical", "vet", svc["Vacuna séxtuple"], "Refuerzo vacuna"),
  apt(petByName.Mia, "15:00:00", "15:30:00", "pending", "medical", "vet", svc["Consulta general"], "Control anual"),

  // Groomer (Diego) - peluquería
  apt(petByName.Toby, "09:00:00", "09:45:00", "completed", "grooming", "groomer", svc["Baño completo"], "Baño regular"),
  apt(petByName.Coco, "10:30:00", "11:30:00", "in_progress", "grooming", "groomer", svc["Corte de pelo"], "Corte completo + baño"),
  apt(petByName.Firulais, "12:00:00", "12:45:00", "ready_for_pickup", "grooming", "groomer", svc["Baño completo"], "Baño express"),
  apt(petByName.Rocky, "16:00:00", "17:00:00", "confirmed", "grooming", "groomer", svc["Corte de pelo"], "Corte estándar"),
];

const { error: aptErr } = await s.from("appointments").insert(appointments);
if (aptErr) die("appointments", aptErr);
console.log("✓ Appointments:", appointments.length);

// ---------------------------------------------------------------
// 7) Facturas (boletas)
// ---------------------------------------------------------------
const nowIso = new Date().toISOString();

const invoices = [
  {
    org_id: org.id,
    client_id: clients[0].id,
    invoice_number: "B-000001",
    status: "paid",
    subtotal: 25000,
    tax_rate: 0,
    tax_amount: 0,
    total: 25000,
    due_date: TODAY,
    paid_at: nowIso,
    notes: "Consulta Firulais - pagado hoy",
  },
  {
    org_id: org.id,
    client_id: clients[1].id,
    invoice_number: "B-000002",
    status: "sent",
    subtotal: 25000,
    tax_rate: 0,
    tax_amount: 0,
    total: 25000,
    due_date: TODAY,
    notes: "Pendiente - Luna",
  },
  {
    org_id: org.id,
    client_id: clients[3].id,
    invoice_number: "B-000003",
    status: "sent",
    subtotal: 15000,
    tax_rate: 0,
    tax_amount: 0,
    total: 15000,
    due_date: TODAY,
    notes: "Pendiente - Toby baño",
  },
  {
    org_id: org.id,
    client_id: clients[2].id,
    invoice_number: "B-000004",
    status: "overdue",
    subtotal: 120000,
    tax_rate: 0,
    tax_amount: 0,
    total: 120000,
    due_date: LAST_WEEK,
    notes: "Vencida - Rocky cirugía",
  },
  {
    org_id: org.id,
    client_id: clients[4].id,
    invoice_number: "B-000005",
    status: "sent",
    subtotal: 18000,
    tax_rate: 0,
    tax_amount: 0,
    total: 18000,
    due_date: YESTERDAY,
    notes: "Vencida ayer - Mia",
  },
];

const { error: invErr } = await s.from("invoices").insert(invoices);
if (invErr) die("invoices", invErr);
console.log("✓ Invoices:", invoices.length);

// ---------------------------------------------------------------
// 8) Productos + stock (uno bajo el mínimo)
// ---------------------------------------------------------------
const { data: products, error: prodErr } = await s
  .from("products")
  .insert([
    { org_id: org.id, name: "Amoxicilina 500mg", category: "medicine", unit: "box", purchase_price: 8000, sale_price: 12000, min_stock: 10, active: true },
    { org_id: org.id, name: "Shampoo antialérgico", category: "supply", unit: "unit", purchase_price: 5000, sale_price: 9000, min_stock: 5, active: true },
    { org_id: org.id, name: "Alimento premium 10kg", category: "food", unit: "kg", purchase_price: 20000, sale_price: 32000, min_stock: 3, active: true },
    { org_id: org.id, name: "Guantes látex", category: "supply", unit: "box", purchase_price: 3000, sale_price: 5000, min_stock: 20, active: true },
  ])
  .select("id, name, min_stock");
if (prodErr) die("products", prodErr);

const stockRows = [
  { product_id: products[0].id, org_id: org.id, quantity: 3 }, // bajo mínimo (10)
  { product_id: products[1].id, org_id: org.id, quantity: 12 },
  { product_id: products[2].id, org_id: org.id, quantity: 1 }, // bajo mínimo (3)
  { product_id: products[3].id, org_id: org.id, quantity: 50 },
];
const { error: stkErr } = await s.from("stock").insert(stockRows);
if (stkErr) die("stock", stkErr);
console.log("✓ Products:", products.length, "(2 con stock bajo)");

// ---------------------------------------------------------------
// 8.5) Grooming records históricos (para poblar el portal del tutor)
// ---------------------------------------------------------------
const lastMonth = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
const twoMonthsAgo = new Date(Date.now() - 60 * 86400000).toISOString().split("T")[0];

const { error: grErr } = await s.from("grooming_records").insert([
  {
    org_id: org.id,
    pet_id: petByName.Firulais.id,
    groomer_id: memberIds.groomer,
    date: lastMonth,
    service_performed: "Baño completo con shampoo hipoalergénico",
    observations: "Pelaje en buen estado. Uñas cortadas.",
  },
  {
    org_id: org.id,
    pet_id: petByName.Firulais.id,
    groomer_id: memberIds.groomer,
    date: twoMonthsAgo,
    service_performed: "Baño completo",
    observations: null,
  },
  {
    org_id: org.id,
    pet_id: petByName.Coco.id,
    groomer_id: memberIds.groomer,
    date: lastMonth,
    service_performed: "Corte de pelo + baño",
    observations: "Corte tipo teddy bear. Oídos limpiados.",
  },
]);
if (grErr) die("grooming_records", grErr);
console.log("✓ Grooming records: 3 históricos");

// ---------------------------------------------------------------
// 9) Tutor demo — vínculo al portal del tutor
// ---------------------------------------------------------------
const TUTOR_EMAIL = "tutor@praxisvet.dev";
const tutorUserId = await ensureAuthUser(TUTOR_EMAIL);

// Asocia el tutor al primer cliente (Ana Muñoz) para que pueda ver sus mascotas.
const tutorClient = clients[0];

// Si había un link previo con ese user en esta org, bórralo antes de insertar
// (el client fue regenerado, los IDs son nuevos).
await s
  .from("client_auth_links")
  .delete()
  .eq("user_id", tutorUserId)
  .eq("org_id", org.id);

const { error: linkErr } = await s.from("client_auth_links").insert({
  client_id: tutorClient.id,
  org_id: org.id,
  user_id: tutorUserId,
  email: TUTOR_EMAIL,
  invited_at: new Date().toISOString(),
  linked_at: new Date().toISOString(),
  active: true,
});
if (linkErr) die("client_auth_links tutor demo", linkErr);
console.log(`✓ Tutor demo: ${TUTOR_EMAIL} → ${tutorClient.first_name} ${tutorClient.last_name}`);

// ---------------------------------------------------------------
// Resumen
// ---------------------------------------------------------------
console.log("\n╔════════════════════════════════════════════════════╗");
console.log("║  ✅ SEED DEMO COMPLETADO                            ║");
console.log("╚════════════════════════════════════════════════════╝");
console.log("\nAccede a: http://localhost:3000/auth/login");
console.log(`Contraseña (todos): ${PASSWORD}\n`);
console.log("Usuarios staff:");
for (const m of members) {
  console.log(`  • ${m.role.padEnd(13)} → ${m.email}`);
}
console.log(`  • tutor         → ${TUTOR_EMAIL}  (portal del tutor)`);
console.log("\nPrueba primero admin, luego cambia rápido entre roles.\n");
