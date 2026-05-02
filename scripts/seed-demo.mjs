/**
 * Seed RICO de demo para PraxisVet — Clinica Demo.
 *
 * Pensado para mostrarle el producto "lleno" a las 10 clínicas fundadoras.
 *
 * Crea:
 *   - 4 staff (admin, vet, recep, groomer) + 1 tutor con login.
 *   - 14 clientes con RUT chileno + 18 mascotas (canino/felino/exótico).
 *   - Servicios médicos + grooming con tarifas por talla.
 *   - Citas pasadas (últimos 30 días, completadas), hoy (mix de estados)
 *     y próximas (14 días).
 *   - Fichas clínicas con SOAP + vitales + recetas + vacunas + desparasitaciones.
 *   - Grooming records históricos.
 *   - Facturas paid / partial_paid / sent / overdue + pagos parciales.
 *   - Productos con stock variado (algunos bajo mínimo).
 *
 * Idempotente: limpia y reinserta. Mantiene los user_id de auth.
 * Password universal: Pablito041994!
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { loadEnv, assertNotProd } from "./lib/db-guard.mjs";

const env = loadEnv();

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

// Guard: este script borra y reinserta. Bloqueado contra producción.
assertNotProd(url, env, "seed-demo");

const s = createClient(url, key, { auth: { persistSession: false } });

const PASSWORD = "Pablito041994!";
const ORG_SLUG = "clinica-demo";

const dayOffset = (n) =>
  new Date(Date.now() + n * 86400000).toISOString().split("T")[0];
const TODAY = dayOffset(0);
const YESTERDAY = dayOffset(-1);
const LAST_WEEK = dayOffset(-7);

async function die(msg, err) {
  console.error("❌", msg, err ?? "");
  process.exit(1);
}

async function ensureAuthUser(email) {
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
// 0) Catálogo global de vacunas (idempotente)
// ---------------------------------------------------------------
const dbUrl =
  env.SUPABASE_DB_URL || env.DATABASE_URL || process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
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

const { error: subErr } = await s
  .from("organizations")
  .update({
    plan: "enterprise",
    subscription_status: "active",
    trial_ends_at: null,
  })
  .eq("id", org.id);
if (subErr) die("activar suscripción demo", subErr);
console.log("✓ Suscripción demo: enterprise · active (sin expiración)");

// ---------------------------------------------------------------
// 2) Staff con login
// ---------------------------------------------------------------
const members = [
  { email: "admin@praxisvet.dev", role: "admin", first_name: "Pablo", last_name: "Gómez", specialty: null },
  { email: "vet@praxisvet.dev", role: "vet", first_name: "María", last_name: "González", specialty: "Medicina felina" },
  { email: "recep@praxisvet.dev", role: "receptionist", first_name: "Camila", last_name: "Rojas", specialty: null },
  { email: "groomer@praxisvet.dev", role: "groomer", first_name: "Diego", last_name: "Pérez", specialty: "Peluquería canina" },
];

const memberIds = {};
for (const m of members) {
  const userId = await ensureAuthUser(m.email);
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
// 3) Clean slate (orden = respeta FKs)
// ---------------------------------------------------------------
async function wipeTable(table, filter = { org_id: org.id }) {
  const k = Object.keys(filter)[0];
  const { error } = await s.from(table).delete().eq(k, filter[k]);
  if (error && !/does not exist|no rows/i.test(error.message)) {
    console.warn(`  ⚠ wipe ${table}:`, error.message);
  }
}

console.log("⟳ Limpiando datos demo previos…");
await wipeTable("payments");
await wipeTable("invoice_items", { invoice_id: "00000000-0000-0000-0000-000000000000" }); // se borrarán al borrar invoices
await wipeTable("invoices");
await wipeTable("prescriptions");
await wipeTable("vaccinations");
await wipeTable("dewormings");
await wipeTable("clinical_record_exams");
await wipeTable("reminders");
await wipeTable("attachments");
await wipeTable("clinical_records");
await wipeTable("grooming_records");
await wipeTable("appointments");
await wipeTable("service_price_tiers");
await wipeTable("pets");
await wipeTable("clients");
await wipeTable("stock");
await wipeTable("products");
await wipeTable("services");

// ---------------------------------------------------------------
// 4) Servicios + tarifas peluquería por talla
// ---------------------------------------------------------------
const { data: services, error: svcErr } = await s
  .from("services")
  .insert([
    { org_id: org.id, name: "Consulta general", category: "consultation", duration_minutes: 30, price: 25000, active: true },
    { org_id: org.id, name: "Control sano", category: "consultation", duration_minutes: 20, price: 18000, active: true },
    { org_id: org.id, name: "Vacuna séxtuple", category: "vaccine", duration_minutes: 15, price: 18000, active: true },
    { org_id: org.id, name: "Vacuna antirrábica", category: "vaccine", duration_minutes: 15, price: 12000, active: true },
    { org_id: org.id, name: "Triple felina", category: "vaccine", duration_minutes: 15, price: 16000, active: true },
    { org_id: org.id, name: "Desparasitación interna", category: "consultation", duration_minutes: 10, price: 8000, active: true },
    { org_id: org.id, name: "Cirugía menor", category: "surgery", duration_minutes: 90, price: 120000, active: true },
    { org_id: org.id, name: "Esterilización", category: "surgery", duration_minutes: 120, price: 180000, active: true },
    { org_id: org.id, name: "Hemograma + bioquímico", category: "lab", duration_minutes: 0, price: 35000, active: true },
    { org_id: org.id, name: "Baño completo", category: "grooming", duration_minutes: 45, price: 15000, active: true },
    { org_id: org.id, name: "Corte de pelo", category: "grooming", duration_minutes: 60, price: 22000, active: true },
    { org_id: org.id, name: "Baño + corte uñas", category: "grooming", duration_minutes: 50, price: 18000, active: true },
  ])
  .select("id, name, category");
if (svcErr) die("services", svcErr);
const svc = Object.fromEntries(services.map((x) => [x.name, x]));
console.log("✓ Services:", services.length);

// Tarifas por talla para grooming
const tiers = [];
for (const size of ["xs", "s", "m", "l", "xl"]) {
  const baseBath = { xs: 12000, s: 15000, m: 18000, l: 22000, xl: 28000 }[size];
  const baseCut = { xs: 18000, s: 22000, m: 26000, l: 32000, xl: 40000 }[size];
  tiers.push({
    org_id: org.id,
    service_id: svc["Baño completo"].id,
    label: `Baño · ${size.toUpperCase()}`,
    species_filter: "canino",
    size,
    price: baseBath,
    active: true,
  });
  tiers.push({
    org_id: org.id,
    service_id: svc["Corte de pelo"].id,
    label: `Corte · ${size.toUpperCase()}`,
    species_filter: "canino",
    size,
    price: baseCut,
    active: true,
  });
}
const { error: tiersErr } = await s.from("service_price_tiers").insert(tiers);
if (tiersErr) die("service_price_tiers", tiersErr);
console.log("✓ Service price tiers:", tiers.length);

// ---------------------------------------------------------------
// 5) Clientes + mascotas
// ---------------------------------------------------------------
const clientsPayload = [
  { first_name: "Ana", last_name: "Muñoz", rut: "12.345.678-9", email: "ana.munoz@example.cl", phone: "+56911111111", address: "Los Olmos 234, Providencia" },
  { first_name: "Javier", last_name: "Castro", rut: "13.456.789-0", email: "javier.castro@example.cl", phone: "+56922222222", address: "Av. Irarrázaval 1450, Ñuñoa" },
  { first_name: "Sofía", last_name: "Vega", rut: "14.567.890-1", email: "sofia.vega@example.cl", phone: "+56933333333", address: "El Bosque 88, Las Condes" },
  { first_name: "Martín", last_name: "Silva", rut: "15.678.901-2", email: "martin.silva@example.cl", phone: "+56944444444", address: "San Diego 920, Santiago Centro" },
  { first_name: "Paula", last_name: "Reyes", rut: "16.789.012-3", email: "paula.reyes@example.cl", phone: "+56955555555", address: "Manuel Montt 567, Providencia" },
  { first_name: "Felipe", last_name: "Soto", rut: "17.234.567-K", email: "felipe.soto@example.cl", phone: "+56966666666", address: "Vicuña Mackenna 3201, Macul" },
  { first_name: "Catalina", last_name: "Bravo", rut: "18.345.678-1", email: "cata.bravo@example.cl", phone: "+56977777777", address: "Pedro de Valdivia 1820, Providencia" },
  { first_name: "Andrés", last_name: "Morales", rut: "19.456.789-2", email: "andres.morales@example.cl", phone: "+56988888888", address: "El Llano 410, San Miguel" },
  { first_name: "Daniela", last_name: "Pizarro", rut: "11.234.567-8", email: "dani.pizarro@example.cl", phone: "+56999999999", address: "Av. Apoquindo 5400, Las Condes" },
  { first_name: "Tomás", last_name: "Aguilera", rut: "10.123.456-7", email: "tomas.aguilera@example.cl", phone: "+56912121212", address: "Ricardo Lyon 230, Providencia" },
  { first_name: "Valentina", last_name: "Carrasco", rut: "20.111.222-3", email: "valentina.c@example.cl", phone: "+56913131313", address: "Bilbao 1944, Providencia" },
  { first_name: "Rodrigo", last_name: "Núñez", rut: "9.876.543-2", email: "rodrigo.nunez@example.cl", phone: "+56914141414", address: "Gran Avenida 6700, La Cisterna" },
  { first_name: "Constanza", last_name: "Lagos", rut: "8.765.432-1", email: "consta.lagos@example.cl", phone: "+56915151515", address: "Tobalaba 1290, Las Condes" },
  { first_name: "Sebastián", last_name: "Fuentes", rut: "21.222.333-4", email: "seba.fuentes@example.cl", phone: "+56916161616", address: "Maipú 1100, Santiago Centro" },
];

const { data: clients, error: clientsErr } = await s
  .from("clients")
  .insert(clientsPayload.map((c) => ({ org_id: org.id, ...c })))
  .select("id, first_name, last_name, email");
if (clientsErr) die("clients", clientsErr);
console.log("✓ Clients:", clients.length);
const cByName = Object.fromEntries(clients.map((c) => [`${c.first_name} ${c.last_name}`, c]));

const petsPayload = [
  { client: "Ana Muñoz", name: "Firulais", species: "canino", breed: "Labrador", color: "Dorado", sex: "male", birthdate: "2018-06-15", weight: 28.5, size: "l", reproductive_status: "sterilized", microchip: "982000412345678", notes: "Alérgico al pollo. Muy sociable." },
  { client: "Ana Muñoz", name: "Coco", species: "canino", breed: "Poodle Toy", color: "Blanco", sex: "female", birthdate: "2021-03-10", weight: 4.2, size: "xs", reproductive_status: "sterilized", notes: "Tolera bien el corte." },
  { client: "Javier Castro", name: "Luna", species: "felino", breed: "Siamés", color: "Crema y café", sex: "female", birthdate: "2019-09-22", weight: 4.1, size: "s", reproductive_status: "sterilized", notes: "Estresada en la sala de espera; preferir sala 2." },
  { client: "Sofía Vega", name: "Rocky", species: "canino", breed: "Bulldog Inglés", color: "Atigrado", sex: "male", birthdate: "2017-01-05", weight: 23.0, size: "m", reproductive_status: "intact", notes: "Ronquidos. Cuidar temperatura en cirugía." },
  { client: "Martín Silva", name: "Toby", species: "canino", breed: "Golden Retriever", color: "Dorado", sex: "male", birthdate: "2020-11-30", weight: 32.0, size: "l", reproductive_status: "intact", notes: "Pelaje denso, baño cada 3 semanas." },
  { client: "Paula Reyes", name: "Mía", species: "felino", breed: "Persa", color: "Blanco", sex: "female", birthdate: "2022-02-14", weight: 3.6, size: "s", reproductive_status: "sterilized", notes: "Lagrimeo frecuente." },
  { client: "Felipe Soto", name: "Thor", species: "canino", breed: "Pastor Alemán", color: "Negro y fuego", sex: "male", birthdate: "2019-04-18", weight: 38.5, size: "xl", reproductive_status: "intact", notes: "Manejo con cuidado: reactivo con desconocidos." },
  { client: "Catalina Bravo", name: "Pelusa", species: "felino", breed: "Mestizo", color: "Atigrado gris", sex: "female", birthdate: "2020-07-08", weight: 4.8, size: "s", reproductive_status: "sterilized", notes: null },
  { client: "Andrés Morales", name: "Max", species: "canino", breed: "Beagle", color: "Tricolor", sex: "male", birthdate: "2021-08-25", weight: 12.5, size: "m", reproductive_status: "intact", notes: "Tendencia al sobrepeso." },
  { client: "Daniela Pizarro", name: "Nala", species: "canino", breed: "Yorkshire", color: "Negro y fuego", sex: "female", birthdate: "2022-05-12", weight: 3.1, size: "xs", reproductive_status: "intact", notes: "Primera consulta el mes pasado." },
  { client: "Tomás Aguilera", name: "Bruno", species: "canino", breed: "Schnauzer Mediano", color: "Sal y pimienta", sex: "male", birthdate: "2018-12-01", weight: 16.5, size: "m", reproductive_status: "sterilized", notes: null },
  { client: "Valentina Carrasco", name: "Simba", species: "felino", breed: "Mestizo naranjo", color: "Naranjo", sex: "male", birthdate: "2019-10-14", weight: 5.2, size: "s", reproductive_status: "intact", notes: "Marcado, considerar castración." },
  { client: "Valentina Carrasco", name: "Ñoño", species: "exotico", breed: "Conejo Holandés", color: "Blanco y negro", sex: "male", birthdate: "2023-01-20", weight: 1.8, size: "xs", reproductive_status: "intact", notes: "Dieta basada en heno timothy." },
  { client: "Rodrigo Núñez", name: "Lola", species: "canino", breed: "Cocker Spaniel", color: "Café", sex: "female", birthdate: "2017-06-30", weight: 13.0, size: "m", reproductive_status: "sterilized", notes: "Otitis recurrente." },
  { client: "Constanza Lagos", name: "Pancho", species: "canino", breed: "Chihuahua", color: "Café claro", sex: "male", birthdate: "2020-02-28", weight: 2.4, size: "xs", reproductive_status: "intact", notes: null },
  { client: "Sebastián Fuentes", name: "Ronnie", species: "canino", breed: "Shih Tzu", color: "Blanco y café", sex: "male", birthdate: "2019-11-11", weight: 7.8, size: "s", reproductive_status: "sterilized", notes: "Pelaje requiere desenredado frecuente." },
  { client: "Felipe Soto", name: "Niebla", species: "felino", breed: "Mestizo", color: "Gris", sex: "female", birthdate: "2023-03-05", weight: 3.2, size: "s", reproductive_status: "intact", notes: "Cachorra, primera vacunación pendiente." },
  { client: "Sofía Vega", name: "Donnie", species: "canino", breed: "Border Collie", color: "Negro y blanco", sex: "male", birthdate: "2022-09-09", weight: 18.0, size: "m", reproductive_status: "intact", notes: "Energía altísima." },
];

const { data: pets, error: petsErr } = await s
  .from("pets")
  .insert(
    petsPayload.map((p) => ({
      org_id: org.id,
      client_id: cByName[p.client].id,
      name: p.name,
      species: p.species,
      breed: p.breed,
      color: p.color,
      sex: p.sex,
      birthdate: p.birthdate,
      weight: p.weight,
      size: p.size,
      reproductive_status: p.reproductive_status,
      microchip: p.microchip ?? null,
      notes: p.notes,
      active: true,
    })),
  )
  .select("id, name, client_id, species");
if (petsErr) die("pets", petsErr);
const pet = Object.fromEntries(pets.map((p) => [p.name, p]));
console.log("✓ Pets:", pets.length);

// ---------------------------------------------------------------
// 6) Citas — pasadas, hoy, futuras
// ---------------------------------------------------------------
function apt({ pet: p, date, start, end, status, type, role, service, reason, danger = false }) {
  return {
    org_id: org.id,
    client_id: p.client_id,
    pet_id: p.id,
    assigned_to: memberIds[role],
    service_id: service?.id ?? null,
    date,
    start_time: start,
    end_time: end,
    status,
    type,
    reason,
    is_dangerous: danger,
  };
}

const pastAppointments = [
  // Hace 30-1 días, todas completadas
  { pet: pet.Firulais, date: dayOffset(-28), start: "10:00:00", end: "10:30:00", status: "completed", type: "medical", role: "vet", service: svc["Consulta general"], reason: "Vómitos esporádicos" },
  { pet: pet.Luna,     date: dayOffset(-25), start: "11:30:00", end: "12:00:00", status: "completed", type: "medical", role: "vet", service: svc["Control sano"], reason: "Control anual" },
  { pet: pet.Rocky,    date: dayOffset(-21), start: "09:00:00", end: "09:15:00", status: "completed", type: "medical", role: "vet", service: svc["Vacuna séxtuple"], reason: "Refuerzo vacuna" },
  { pet: pet.Toby,     date: dayOffset(-20), start: "16:00:00", end: "16:45:00", status: "completed", type: "grooming", role: "groomer", service: svc["Baño completo"], reason: "Baño mensual" },
  { pet: pet.Mía,      date: dayOffset(-18), start: "10:00:00", end: "10:30:00", status: "completed", type: "medical", role: "vet", service: svc["Consulta general"], reason: "Lagrimeo persistente" },
  { pet: pet.Thor,     date: dayOffset(-15), start: "12:00:00", end: "12:30:00", status: "completed", type: "medical", role: "vet", service: svc["Vacuna antirrábica"], reason: "Antirrábica anual", danger: true },
  { pet: pet.Pelusa,   date: dayOffset(-14), start: "14:00:00", end: "14:30:00", status: "completed", type: "medical", role: "vet", service: svc["Triple felina"], reason: "Refuerzo" },
  { pet: pet.Max,      date: dayOffset(-12), start: "11:00:00", end: "11:30:00", status: "completed", type: "medical", role: "vet", service: svc["Consulta general"], reason: "Control de peso" },
  { pet: pet.Coco,     date: dayOffset(-10), start: "13:00:00", end: "14:00:00", status: "completed", type: "grooming", role: "groomer", service: svc["Corte de pelo"], reason: "Corte tipo teddy" },
  { pet: pet.Bruno,    date: dayOffset(-9),  start: "15:00:00", end: "15:30:00", status: "completed", type: "medical", role: "vet", service: svc["Desparasitación interna"], reason: "Desparasitación rutinaria" },
  { pet: pet.Lola,     date: dayOffset(-7),  start: "10:00:00", end: "10:30:00", status: "completed", type: "medical", role: "vet", service: svc["Consulta general"], reason: "Otitis recurrente" },
  { pet: pet.Ronnie,   date: dayOffset(-7),  start: "16:00:00", end: "16:50:00", status: "completed", type: "grooming", role: "groomer", service: svc["Baño + corte uñas"], reason: "Baño + corte" },
  { pet: pet.Donnie,   date: dayOffset(-5),  start: "11:00:00", end: "11:30:00", status: "completed", type: "medical", role: "vet", service: svc["Vacuna séxtuple"], reason: "Refuerzo" },
  { pet: pet.Pancho,   date: dayOffset(-4),  start: "10:30:00", end: "11:00:00", status: "completed", type: "medical", role: "vet", service: svc["Control sano"], reason: "Chequeo general" },
  { pet: pet.Simba,    date: dayOffset(-3),  start: "12:00:00", end: "12:30:00", status: "completed", type: "medical", role: "vet", service: svc["Consulta general"], reason: "Lesión en oreja" },
  { pet: pet.Firulais, date: dayOffset(-2),  start: "17:00:00", end: "17:45:00", status: "completed", type: "grooming", role: "groomer", service: svc["Baño completo"], reason: "Baño regular" },
  { pet: pet.Nala,     date: dayOffset(-1),  start: "10:00:00", end: "10:30:00", status: "completed", type: "medical", role: "vet", service: svc["Vacuna séxtuple"], reason: "Primera vacunación" },
];

const todayAppointments = [
  // Vet (María)
  { pet: pet.Firulais, date: TODAY, start: "08:30:00", end: "09:00:00", status: "completed",       type: "medical",  role: "vet",     service: svc["Consulta general"], reason: "Control general" },
  { pet: pet.Luna,     date: TODAY, start: "09:30:00", end: "10:00:00", status: "in_progress",     type: "medical",  role: "vet",     service: svc["Consulta general"], reason: "Revisar ojos rojos" },
  { pet: pet.Rocky,    date: TODAY, start: "11:00:00", end: "11:15:00", status: "confirmed",       type: "medical",  role: "vet",     service: svc["Vacuna séxtuple"],  reason: "Refuerzo vacuna" },
  { pet: pet.Mía,      date: TODAY, start: "15:00:00", end: "15:30:00", status: "pending",         type: "medical",  role: "vet",     service: svc["Consulta general"], reason: "Control anual" },
  { pet: pet.Thor,     date: TODAY, start: "17:00:00", end: "17:30:00", status: "confirmed",       type: "medical",  role: "vet",     service: svc["Hemograma + bioquímico"], reason: "Pre-quirúrgico", danger: true },
  // Groomer (Diego)
  { pet: pet.Toby,    date: TODAY, start: "09:00:00", end: "09:45:00", status: "completed",        type: "grooming", role: "groomer", service: svc["Baño completo"], reason: "Baño regular" },
  { pet: pet.Coco,    date: TODAY, start: "10:30:00", end: "11:30:00", status: "in_progress",      type: "grooming", role: "groomer", service: svc["Corte de pelo"], reason: "Corte completo + baño" },
  { pet: pet.Firulais,date: TODAY, start: "12:00:00", end: "12:45:00", status: "ready_for_pickup", type: "grooming", role: "groomer", service: svc["Baño completo"], reason: "Baño express" },
  { pet: pet.Rocky,   date: TODAY, start: "16:00:00", end: "17:00:00", status: "confirmed",        type: "grooming", role: "groomer", service: svc["Corte de pelo"], reason: "Corte estándar" },
];

const upcoming = [
  { pet: pet.Niebla, date: dayOffset(1),  start: "10:00:00", end: "10:30:00", status: "confirmed", type: "medical",  role: "vet",     service: svc["Vacuna séxtuple"],   reason: "Primera vacunación" },
  { pet: pet.Ñoño,   date: dayOffset(1),  start: "11:00:00", end: "11:30:00", status: "confirmed", type: "medical",  role: "vet",     service: svc["Consulta general"],  reason: "Revisión general (conejo)" },
  { pet: pet.Toby,   date: dayOffset(2),  start: "09:00:00", end: "11:00:00", status: "confirmed", type: "medical",  role: "vet",     service: svc["Esterilización"],    reason: "Cirugía electiva" },
  { pet: pet.Donnie, date: dayOffset(3),  start: "15:00:00", end: "16:00:00", status: "confirmed", type: "grooming", role: "groomer", service: svc["Corte de pelo"],     reason: "Mantención" },
  { pet: pet.Lola,   date: dayOffset(5),  start: "10:30:00", end: "11:00:00", status: "pending",   type: "medical",  role: "vet",     service: svc["Consulta general"],  reason: "Control otitis" },
  { pet: pet.Mía,    date: dayOffset(7),  start: "12:00:00", end: "12:30:00", status: "pending",   type: "medical",  role: "vet",     service: svc["Consulta general"],  reason: "Control oftalmológico" },
  { pet: pet.Bruno,  date: dayOffset(8),  start: "16:00:00", end: "16:50:00", status: "pending",   type: "grooming", role: "groomer", service: svc["Baño + corte uñas"], reason: "Baño + corte uñas" },
  { pet: pet.Pelusa, date: dayOffset(10), start: "11:00:00", end: "11:30:00", status: "pending",   type: "medical",  role: "vet",     service: svc["Control sano"],      reason: "Control trimestral" },
  { pet: pet.Max,    date: dayOffset(12), start: "10:00:00", end: "10:30:00", status: "pending",   type: "medical",  role: "vet",     service: svc["Consulta general"],  reason: "Seguimiento sobrepeso" },
];

const allAppts = [...pastAppointments, ...todayAppointments, ...upcoming].map(apt);
const { data: insertedAppts, error: aptErr } = await s.from("appointments").insert(allAppts).select("id, pet_id, type, status, date, service_id");
if (aptErr) die("appointments", aptErr);
console.log("✓ Appointments:", insertedAppts.length, `(pasadas ${pastAppointments.length}, hoy ${todayAppointments.length}, próximas ${upcoming.length})`);

// ---------------------------------------------------------------
// 7) Fichas clínicas + recetas + vacunas + desparasitaciones
// ---------------------------------------------------------------
const completedMedical = insertedAppts.filter((a) => a.status === "completed" && a.type === "medical");
const petWeightById = Object.fromEntries(pets.map((p) => [p.id, petsPayload.find((x) => x.name === p.name)?.weight ?? null]));

const clinicalRecordsRows = completedMedical.map((a) => {
  const w = petWeightById[a.pet_id];
  // SOAP simplificado en campos existentes
  return {
    org_id: org.id,
    pet_id: a.pet_id,
    appointment_id: a.id,
    vet_id: memberIds.vet,
    date: a.date,
    reason: "Atención completada",
    anamnesis: "Tutor refiere comportamiento normal en casa. Apetito conservado. Sin diarrea ni vómitos en últimas 48h.",
    symptoms: "Sin signos de dolor a la palpación abdominal. Mucosas rosadas, TLLC < 2 seg.",
    diagnosis: "Paciente clínicamente sano para la edad y especie.",
    treatment: "Manejo preventivo. Continuar dieta actual. Próximo control de rutina en 6 meses.",
    observations: null,
    weight: w,
    temperature: 38.5,
    heart_rate: 110,
    respiratory_rate: 24,
    capillary_refill_seconds: 1.5,
    skin_fold_seconds: 1.0,
    next_consultation_date: dayOffset(180),
    next_consultation_note: "Control semestral",
  };
});

const { data: clinicalRecs, error: crErr } = await s.from("clinical_records").insert(clinicalRecordsRows).select("id, pet_id, appointment_id");
if (crErr) die("clinical_records", crErr);
console.log("✓ Clinical records:", clinicalRecs.length);

// Recetas para algunas fichas
const prescriptionsRows = [];
for (const cr of clinicalRecs.slice(0, 6)) {
  prescriptionsRows.push({
    org_id: org.id,
    clinical_record_id: cr.id,
    medication: "Amoxicilina 500mg",
    dose: "1 cápsula",
    frequency: "Cada 12 horas",
    duration: "7 días",
    notes: "Administrar con alimento.",
    is_retained: false,
  });
}
// Una receta retenida (psicotrópico) para mostrar el caso
if (clinicalRecs[2]) {
  prescriptionsRows.push({
    org_id: org.id,
    clinical_record_id: clinicalRecs[2].id,
    medication: "Tramadol 50mg",
    dose: "1/2 comprimido",
    frequency: "Cada 12 horas",
    duration: "5 días",
    notes: "Manejo del dolor post-quirúrgico.",
    is_retained: true,
  });
}
const { error: rxErr } = await s.from("prescriptions").insert(prescriptionsRows);
if (rxErr) die("prescriptions", rxErr);
console.log("✓ Prescriptions:", prescriptionsRows.length, "(1 retenida)");

// Vacunaciones (mezcla histórica)
const vaccinationsRows = [];
for (const p of pets) {
  if (p.species === "exotico") continue;
  vaccinationsRows.push({
    org_id: org.id,
    pet_id: p.id,
    vaccine_name: p.species === "felino" ? "Triple felina" : "Séxtuple canina",
    lot_number: "LOT-2026-A47",
    date_administered: dayOffset(-Math.floor(Math.random() * 60) - 5),
    next_due_date: dayOffset(Math.floor(Math.random() * 200) + 90),
    vet_id: memberIds.vet,
    notes: null,
  });
  if (p.species === "canino" && Math.random() > 0.4) {
    vaccinationsRows.push({
      org_id: org.id,
      pet_id: p.id,
      vaccine_name: "Antirrábica",
      lot_number: "LOT-2026-RAB-12",
      date_administered: dayOffset(-Math.floor(Math.random() * 180) - 30),
      next_due_date: dayOffset(Math.floor(Math.random() * 200) + 60),
      vet_id: memberIds.vet,
      notes: null,
    });
  }
}
const { error: vxErr } = await s.from("vaccinations").insert(vaccinationsRows);
if (vxErr) die("vaccinations", vxErr);
console.log("✓ Vaccinations:", vaccinationsRows.length);

// Desparasitaciones
const dewormingsRows = [];
for (const p of pets.slice(0, 12)) {
  dewormingsRows.push({
    org_id: org.id,
    pet_id: p.id,
    vet_id: memberIds.vet,
    type: "interna",
    date_administered: dayOffset(-Math.floor(Math.random() * 60) - 10),
    product: "Drontal Plus",
    pregnant_cohabitation: false,
    notes: null,
  });
  if (Math.random() > 0.5) {
    dewormingsRows.push({
      org_id: org.id,
      pet_id: p.id,
      vet_id: memberIds.vet,
      type: "externa",
      date_administered: dayOffset(-Math.floor(Math.random() * 30) - 5),
      product: "Bravecto",
      pregnant_cohabitation: false,
      notes: null,
    });
  }
}
const { error: dwErr } = await s.from("dewormings").insert(dewormingsRows);
if (dwErr) die("dewormings", dwErr);
console.log("✓ Dewormings:", dewormingsRows.length);

// ---------------------------------------------------------------
// 8) Grooming records históricos
// ---------------------------------------------------------------
const completedGrooming = insertedAppts.filter((a) => a.status === "completed" && a.type === "grooming");
const groomingRows = completedGrooming.map((a) => ({
  org_id: org.id,
  pet_id: a.pet_id,
  appointment_id: a.id,
  groomer_id: memberIds.groomer,
  date: a.date,
  service_performed: "Baño + secado + corte de uñas. Limpieza de oídos.",
  observations: "Pelaje en buen estado. Sin pulgas ni garrapatas detectadas.",
}));
// Algunos extra sin appointment para mostrar histórico denso
groomingRows.push(
  {
    org_id: org.id,
    pet_id: pet.Firulais.id,
    groomer_id: memberIds.groomer,
    date: dayOffset(-45),
    service_performed: "Baño completo con shampoo hipoalergénico",
    observations: "Pelaje opaco, recomendar suplemento omega.",
  },
  {
    org_id: org.id,
    pet_id: pet.Coco.id,
    groomer_id: memberIds.groomer,
    date: dayOffset(-50),
    service_performed: "Corte tipo teddy bear + baño",
    observations: null,
  },
);
const { error: grErr } = await s.from("grooming_records").insert(groomingRows);
if (grErr) die("grooming_records", grErr);
console.log("✓ Grooming records:", groomingRows.length);

// ---------------------------------------------------------------
// 9) Facturas + abonos
// ---------------------------------------------------------------
const nowIso = new Date().toISOString();

// Generador de número de boleta correlativo
let boletaSeq = 1;
const boleta = () => `B-${String(boletaSeq++).padStart(6, "0")}`;

const invoicesPayload = [
  // Pagadas (semanas anteriores)
  { client: "Ana Muñoz",      total: 25000, status: "paid", due: dayOffset(-28), paid_at: dayOffset(-28), notes: "Consulta Firulais" },
  { client: "Javier Castro",  total: 18000, status: "paid", due: dayOffset(-25), paid_at: dayOffset(-25), notes: "Control sano Luna" },
  { client: "Sofía Vega",     total: 18000, status: "paid", due: dayOffset(-21), paid_at: dayOffset(-21), notes: "Vacuna Rocky" },
  { client: "Martín Silva",   total: 22000, status: "paid", due: dayOffset(-20), paid_at: dayOffset(-20), notes: "Baño Toby" },
  { client: "Felipe Soto",    total: 12000, status: "paid", due: dayOffset(-15), paid_at: dayOffset(-15), notes: "Antirrábica Thor" },
  { client: "Catalina Bravo", total: 16000, status: "paid", due: dayOffset(-14), paid_at: dayOffset(-14), notes: "Triple felina Pelusa" },
  { client: "Andrés Morales", total: 25000, status: "paid", due: dayOffset(-12), paid_at: dayOffset(-12), notes: "Control de peso Max" },
  { client: "Rodrigo Núñez",  total: 25000, status: "paid", due: dayOffset(-7),  paid_at: dayOffset(-7),  notes: "Otitis Lola" },
  { client: "Sebastián Fuentes", total: 18000, status: "paid", due: dayOffset(-7), paid_at: dayOffset(-7), notes: "Baño + uñas Ronnie" },
  // Pagada hoy
  { client: "Ana Muñoz", total: 25000, status: "paid", due: TODAY, paid_at: nowIso, notes: "Consulta hoy Firulais" },

  // Pendientes (sent)
  { client: "Javier Castro", total: 25000, status: "sent", due: TODAY, paid_at: null, notes: "Pendiente Luna" },
  { client: "Martín Silva",  total: 15000, status: "sent", due: TODAY, paid_at: null, notes: "Pendiente Toby baño" },
  { client: "Daniela Pizarro", total: 18000, status: "sent", due: dayOffset(3), paid_at: null, notes: "Vacuna Nala" },

  // Vencidas
  { client: "Sofía Vega",  total: 120000, status: "overdue", due: LAST_WEEK,  paid_at: null, notes: "Vencida cirugía Rocky" },
  { client: "Paula Reyes", total: 18000,  status: "overdue", due: YESTERDAY,  paid_at: null, notes: "Vencida ayer Mía" },

  // Para abono parcial (se completará después insertando payment)
  { client: "Constanza Lagos", total: 180000, status: "sent", due: dayOffset(10), paid_at: null, notes: "Esterilización Pancho — abono pendiente" },
  { client: "Tomás Aguilera",  total: 35000,  status: "sent", due: dayOffset(5),  paid_at: null, notes: "Hemograma Bruno — abono inicial" },
];

const invoicesRows = invoicesPayload.map((i) => ({
  org_id: org.id,
  client_id: cByName[i.client].id,
  invoice_number: boleta(),
  status: i.status,
  subtotal: i.total,
  tax_rate: 0,
  tax_amount: 0,
  total: i.total,
  due_date: i.due,
  paid_at: i.paid_at,
  notes: i.notes,
}));

const { data: invoices, error: invErr } = await s.from("invoices").insert(invoicesRows).select("id, total, status, notes");
if (invErr) die("invoices", invErr);
console.log("✓ Invoices:", invoices.length);

// Pagos completos para las paid
const fullyPaid = invoices.filter((i) => i.status === "paid");
const paymentsRows = fullyPaid.map((i) => ({
  org_id: org.id,
  invoice_id: i.id,
  amount: Number(i.total),
  method: ["cash", "card", "transfer"][Math.floor(Math.random() * 3)],
  reference: null,
  notes: "Pago completo",
}));

// Abono parcial para "Esterilización Pancho" (50%)
const ester = invoices.find((i) => i.notes?.startsWith("Esterilización Pancho"));
if (ester) {
  paymentsRows.push({
    org_id: org.id,
    invoice_id: ester.id,
    amount: 90000,
    method: "transfer",
    reference: "Abono 50% pre-cirugía",
    notes: "Primer abono",
  });
}
// Abono parcial para "Hemograma Bruno" (40%)
const hemo = invoices.find((i) => i.notes?.startsWith("Hemograma Bruno"));
if (hemo) {
  paymentsRows.push({
    org_id: org.id,
    invoice_id: hemo.id,
    amount: 14000,
    method: "cash",
    reference: null,
    notes: "Abono inicial 40%",
  });
}

const { error: payErr } = await s.from("payments").insert(paymentsRows);
if (payErr) die("payments", payErr);
console.log("✓ Payments:", paymentsRows.length, "(2 abonos parciales)");

// ---------------------------------------------------------------
// 10) Productos + stock
// ---------------------------------------------------------------
const { data: products, error: prodErr } = await s
  .from("products")
  .insert([
    { org_id: org.id, name: "Amoxicilina 500mg", category: "medicine", unit: "box", purchase_price: 8000, sale_price: 12000, min_stock: 10, active: true },
    { org_id: org.id, name: "Meloxicam 1.5mg/ml", category: "medicine", unit: "unit", purchase_price: 7000, sale_price: 11000, min_stock: 5, active: true },
    { org_id: org.id, name: "Shampoo antialérgico", category: "supply", unit: "unit", purchase_price: 5000, sale_price: 9000, min_stock: 5, active: true },
    { org_id: org.id, name: "Alimento premium 10kg", category: "food", unit: "kg", purchase_price: 20000, sale_price: 32000, min_stock: 3, active: true },
    { org_id: org.id, name: "Guantes látex (caja 100)", category: "supply", unit: "box", purchase_price: 3000, sale_price: 5000, min_stock: 20, active: true },
    { org_id: org.id, name: "Bravecto Antiparasitario", category: "medicine", unit: "unit", purchase_price: 18000, sale_price: 28000, min_stock: 6, active: true },
    { org_id: org.id, name: "Drontal Plus", category: "medicine", unit: "unit", purchase_price: 4500, sale_price: 7500, min_stock: 10, active: true },
    { org_id: org.id, name: "Jeringa 3ml estéril", category: "supply", unit: "unit", purchase_price: 200, sale_price: 500, min_stock: 50, active: true },
  ])
  .select("id, name, min_stock");
if (prodErr) die("products", prodErr);

const stockMap = {
  "Amoxicilina 500mg": 3,           // bajo mínimo
  "Meloxicam 1.5mg/ml": 12,
  "Shampoo antialérgico": 14,
  "Alimento premium 10kg": 1,       // bajo mínimo
  "Guantes látex (caja 100)": 50,
  "Bravecto Antiparasitario": 4,    // bajo mínimo
  "Drontal Plus": 22,
  "Jeringa 3ml estéril": 200,
};
const stockRows = products.map((p) => ({
  product_id: p.id,
  org_id: org.id,
  quantity: stockMap[p.name] ?? 10,
}));
const { error: stkErr } = await s.from("stock").insert(stockRows);
if (stkErr) die("stock", stkErr);
console.log("✓ Products:", products.length, "(3 con stock bajo)");

// ---------------------------------------------------------------
// 11) Tutor demo (portal)
// ---------------------------------------------------------------
const TUTOR_EMAIL = "tutor@praxisvet.dev";
const tutorUserId = await ensureAuthUser(TUTOR_EMAIL);
const tutorClient = cByName["Ana Muñoz"];

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
console.log("║  ✅ SEED DEMO RICO COMPLETADO                       ║");
console.log("╚════════════════════════════════════════════════════╝");
console.log("\nAccede a: http://localhost:3000/auth/login");
console.log(`Contraseña (todos): ${PASSWORD}\n`);
console.log("Usuarios staff:");
for (const m of members) {
  console.log(`  • ${m.role.padEnd(13)} → ${m.email}`);
}
console.log(`  • tutor         → ${TUTOR_EMAIL}  (portal del tutor)`);
console.log(`\nDataset: ${clients.length} clientes · ${pets.length} mascotas · ${insertedAppts.length} citas · ${clinicalRecs.length} fichas · ${invoices.length} facturas\n`);
