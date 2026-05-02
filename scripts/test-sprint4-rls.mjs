/**
 * Sprint 4 — Tests de RLS multi-tenant + privilege escalation.
 *
 * Cubre 4 tablas nuevas del Sprint 4:
 *   • member_weekly_schedules
 *   • member_schedule_blocks   (usa start_date/end_date si 20260422000004 aplicó, sino start_at/end_at)
 *   • member_capabilities      (PK compuesta member_id + capability)
 *   • sent_birthday_log        (PK compuesta pet_id + sent_on; SELECT admin-only)
 *
 * Grupos de tests:
 *   A — Privilege escalation dentro de misma org (vet/recep/admin en clinica-demo)
 *   B — Cross-tenant isolation (admin demo no ve/modifica org B temporal)
 *   C — Anonymous (sin sesión)
 *   D — Cobertura de policies (metadatos via pg_policies)
 *
 * Uso:
 *   node scripts/test-sprint4-rls.mjs
 *
 * Variables de entorno requeridas en .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Exit code: 0 si todos los tests pasan, 1 si alguno falla o el setup falla.
 */

import { createClient } from "@supabase/supabase-js";
import { loadEnv, assertNotProd } from "./lib/db-guard.mjs";

// ---------------------------------------------------------------
// Config / env
// ---------------------------------------------------------------
const env = loadEnv();

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

// Guard: este test crea y borra orgs. Solo dev.
assertNotProd(url, env, "test-sprint4-rls");

if (!url || !anon || !serviceKey) {
  console.error(
    "❌ Faltan envs. Requeridos: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY",
  );
  process.exit(1);
}

const PASSWORD = "Pablito041994!";
const ORG_SLUG = "clinica-demo";

const EMAILS = {
  admin: "admin@praxisvet.dev",
  vet: "vet@praxisvet.dev",
  recep: "recep@praxisvet.dev",
  groomer: "groomer@praxisvet.dev",
};

// ---------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------
let pass = 0;
let fail = 0;
const failures = [];

function expect(name, pred, detail = "") {
  if (pred) {
    console.log(`  ✓ ${name}`);
    pass++;
  } else {
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
    fail++;
    failures.push(name);
  }
}

function section(title) {
  console.log(`\n## ${title}`);
}

function makeAnon() {
  return createClient(url, anon, { auth: { persistSession: false } });
}

async function loginAs(email) {
  const c = makeAnon();
  const { data, error } = await c.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`Login ${email} falló: ${error.message}`);
  return { client: c, userId: data.user.id };
}

// ---------------------------------------------------------------
// Service-role client (setup / inspección)
// ---------------------------------------------------------------
const svc = createClient(url, serviceKey, { auth: { persistSession: false } });

// ---------------------------------------------------------------
// Estado compartido (setup + cleanup)
// ---------------------------------------------------------------
let blockDateCol = null; // 'date' si migración 4 aplicó, 'timestamp' si no
let demoOrg = null;
let demoMembers = { admin: null, vet: null, recep: null, groomer: null };
let orgB = { org: null, adminUser: null, adminMember: null, vetMember: null };

// ---------------------------------------------------------------
// Setup
// ---------------------------------------------------------------
async function detectBlockColumns() {
  const { data, error } = await svc
    .from("information_schema.columns")
    // information_schema no es accesible vía PostgREST por defecto; usamos RPC-like
    .select("column_name")
    .eq("table_schema", "public")
    .eq("table_name", "member_schedule_blocks");
  if (error || !data) {
    // Fallback: probar describiendo un SELECT
    const probe = await svc.from("member_schedule_blocks").select("start_date, end_date").limit(1);
    blockDateCol = probe.error ? "timestamp" : "date";
    return;
  }
  const cols = data.map((r) => r.column_name);
  blockDateCol = cols.includes("start_date") ? "date" : "timestamp";
}

async function loadDemoOrg() {
  const { data: org, error } = await svc
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", ORG_SLUG)
    .single();
  if (error || !org) throw new Error(`Org ${ORG_SLUG} no encontrada. Corre scripts/seed-demo.mjs primero.`);
  demoOrg = org;

  const { data: members, error: mErr } = await svc
    .from("organization_members")
    .select("id, user_id, role, first_name, last_name")
    .eq("org_id", org.id);
  if (mErr) throw new Error(`Cargar members demo: ${mErr.message}`);

  demoMembers.admin = members.find((m) => m.role === "admin");
  demoMembers.vet = members.find((m) => m.role === "vet");
  demoMembers.recep = members.find((m) => m.role === "receptionist");
  demoMembers.groomer = members.find((m) => m.role === "groomer");

  if (!demoMembers.admin || !demoMembers.vet || !demoMembers.recep || !demoMembers.groomer) {
    throw new Error("Faltan miembros demo. Corre scripts/seed-demo.mjs");
  }
}

async function createOrgB() {
  const suffix = Date.now();
  const slug = `test-sprint4-org-b-${suffix}`;
  const { data: org, error: oErr } = await svc
    .from("organizations")
    .insert({ name: `Test Sprint4 Org B ${suffix}`, slug })
    .select("id, slug")
    .single();
  if (oErr) throw new Error(`Crear org B: ${oErr.message}`);
  orgB.org = org;

  const adminEmail = `sprint4-admin-b-${suffix}@praxisvet.test`;
  const { data: userRes, error: uErr } = await svc.auth.admin.createUser({
    email: adminEmail,
    password: PASSWORD,
    email_confirm: true,
  });
  if (uErr) throw new Error(`Crear auth user B: ${uErr.message}`);
  orgB.adminUser = userRes.user;

  const { data: adminMember, error: amErr } = await svc
    .from("organization_members")
    .insert({
      org_id: org.id,
      user_id: userRes.user.id,
      role: "admin",
      first_name: "Admin",
      last_name: "OrgB",
      active: true,
    })
    .select("id")
    .single();
  if (amErr) throw new Error(`Insert admin member B: ${amErr.message}`);
  orgB.adminMember = adminMember;

  // Vet en org B (sin usuario auth asociado, es staff "hueco" para poder referenciarlo)
  const { data: vetMember, error: vmErr } = await svc
    .from("organization_members")
    .insert({
      org_id: org.id,
      user_id: null,
      role: "vet",
      first_name: "Vet",
      last_name: "OrgB",
      active: true,
    })
    .select("id")
    .single();
  if (vmErr) throw new Error(`Insert vet member B: ${vmErr.message}`);
  orgB.vetMember = vetMember;

  // Sembramos una fila en cada tabla sensible para probar cross-tenant reads/updates/deletes
  const blockPayload =
    blockDateCol === "date"
      ? { start_date: "2026-05-01", end_date: "2026-05-02" }
      : { start_at: "2026-05-01T09:00:00Z", end_at: "2026-05-02T18:00:00Z" };

  await svc.from("member_weekly_schedules").insert({
    org_id: org.id,
    member_id: vetMember.id,
    day_of_week: 1,
    start_time: "09:00:00",
    end_time: "18:00:00",
  });

  await svc.from("member_schedule_blocks").insert({
    org_id: org.id,
    member_id: vetMember.id,
    reason: "Vacaciones cross-tenant",
    ...blockPayload,
  });

  await svc.from("member_capabilities").insert({
    org_id: org.id,
    member_id: vetMember.id,
    capability: "can_vet",
  });
}

async function cleanupOrgB() {
  try {
    if (orgB.org?.id) {
      // Borrar datos dependientes explícitamente por si no hay CASCADE
      await svc.from("member_weekly_schedules").delete().eq("org_id", orgB.org.id);
      await svc.from("member_schedule_blocks").delete().eq("org_id", orgB.org.id);
      await svc.from("member_capabilities").delete().eq("org_id", orgB.org.id);
      await svc.from("organization_members").delete().eq("org_id", orgB.org.id);
      await svc.from("organizations").delete().eq("id", orgB.org.id);
    }
    if (orgB.adminUser?.id) {
      await svc.auth.admin.deleteUser(orgB.adminUser.id);
    }
  } catch (e) {
    console.warn("⚠ cleanup org B:", e.message);
  }
}

// ---------------------------------------------------------------
// Grupos de tests
// ---------------------------------------------------------------
async function groupA() {
  section("Grupo A — Privilege escalation dentro de misma org");

  // --- Login como vet ---
  const { client: vetClient } = await loginAs(EMAILS.vet);

  // A1: INSERT member_weekly_schedules para sí mismo
  {
    const { data, error } = await vetClient
      .from("member_weekly_schedules")
      .insert({
        org_id: demoOrg.id,
        member_id: demoMembers.vet.id,
        day_of_week: 2,
        start_time: "09:00:00",
        end_time: "13:00:00",
      })
      .select();
    expect(
      "A1 vet NO puede INSERT en member_weekly_schedules",
      error !== null || (data ?? []).length === 0,
      error?.message ?? "",
    );
  }

  // A2: INSERT member_schedule_blocks
  {
    const payload =
      blockDateCol === "date"
        ? {
            org_id: demoOrg.id,
            member_id: demoMembers.vet.id,
            reason: "test",
            start_date: "2026-05-10",
            end_date: "2026-05-11",
          }
        : {
            org_id: demoOrg.id,
            member_id: demoMembers.vet.id,
            reason: "test",
            start_at: "2026-05-10T09:00:00Z",
            end_at: "2026-05-11T18:00:00Z",
          };
    const { data, error } = await vetClient.from("member_schedule_blocks").insert(payload).select();
    expect(
      "A2 vet NO puede INSERT en member_schedule_blocks",
      error !== null || (data ?? []).length === 0,
      error?.message ?? "",
    );
  }

  // A3: INSERT member_capabilities (auto-asignarse can_groom)
  {
    const { data, error } = await vetClient
      .from("member_capabilities")
      .insert({
        org_id: demoOrg.id,
        member_id: demoMembers.vet.id,
        capability: "can_groom",
      })
      .select();
    expect(
      "A3 vet NO puede auto-asignarse capability can_groom",
      error !== null || (data ?? []).length === 0,
      error?.message ?? "",
    );
  }

  // A4: SELECT sent_birthday_log (admin-only)
  {
    const { data, error } = await vetClient.from("sent_birthday_log").select("*");
    expect(
      "A4 vet NO ve sent_birthday_log (admin-only)",
      error !== null || (data ?? []).length === 0,
      error?.message ?? "",
    );
  }

  // A5: UPDATE member_weekly_schedules ajeno (del groomer)
  {
    // Crear una fila via service_role para poder intentar actualizarla
    const { data: inserted } = await svc
      .from("member_weekly_schedules")
      .insert({
        org_id: demoOrg.id,
        member_id: demoMembers.groomer.id,
        day_of_week: 3,
        start_time: "10:00:00",
        end_time: "14:00:00",
      })
      .select("id")
      .single();

    const targetId = inserted?.id;
    const { data: updated } = await vetClient
      .from("member_weekly_schedules")
      .update({ end_time: "23:59:00" })
      .eq("id", targetId)
      .select();
    expect(
      "A5 vet NO puede UPDATE horario ajeno (0 filas afectadas)",
      (updated ?? []).length === 0,
    );

    // Cleanup de la fila sembrada
    if (targetId) await svc.from("member_weekly_schedules").delete().eq("id", targetId);
  }

  // A6: DELETE de capability ajena
  {
    // Sembrar capability del groomer
    await svc
      .from("member_capabilities")
      .upsert(
        {
          org_id: demoOrg.id,
          member_id: demoMembers.groomer.id,
          capability: "can_groom",
        },
        { onConflict: "member_id,capability" },
      );

    const { data: deleted } = await vetClient
      .from("member_capabilities")
      .delete()
      .eq("member_id", demoMembers.groomer.id)
      .eq("capability", "can_groom")
      .select();
    expect(
      "A6 vet NO puede DELETE capability ajena (0 filas afectadas)",
      (deleted ?? []).length === 0,
    );
  }

  // --- Login como recepcionista ---
  const { client: recepClient } = await loginAs(EMAILS.recep);

  // A7: SELECT member_weekly_schedules (SELECT libre para miembros de la org)
  {
    const { data, error } = await recepClient.from("member_weekly_schedules").select("id");
    expect(
      "A7 recep SÍ puede SELECT member_weekly_schedules (SELECT abierto a org)",
      !error && Array.isArray(data),
      error?.message ?? "",
    );
  }

  // A8: INSERT en member_capabilities
  {
    const { data, error } = await recepClient
      .from("member_capabilities")
      .insert({
        org_id: demoOrg.id,
        member_id: demoMembers.vet.id,
        capability: "can_groom",
      })
      .select();
    expect(
      "A8 recep NO puede INSERT member_capabilities",
      error !== null || (data ?? []).length === 0,
      error?.message ?? "",
    );
  }

  // --- Login como admin ---
  const { client: adminClient } = await loginAs(EMAILS.admin);

  // A9: INSERT member_weekly_schedules para un vet de la misma org
  let createdScheduleId = null;
  {
    const { data, error } = await adminClient
      .from("member_weekly_schedules")
      .insert({
        org_id: demoOrg.id,
        member_id: demoMembers.vet.id,
        day_of_week: 4,
        start_time: "15:00:00",
        end_time: "19:00:00",
      })
      .select("id")
      .single();
    createdScheduleId = data?.id ?? null;
    expect(
      "A9 admin SÍ puede INSERT member_weekly_schedules",
      !error && createdScheduleId !== null,
      error?.message ?? "",
    );
  }

  // A10: Limpieza — admin DELETE su propia inserción
  {
    if (createdScheduleId) {
      const { data: deleted, error } = await adminClient
        .from("member_weekly_schedules")
        .delete()
        .eq("id", createdScheduleId)
        .select();
      expect(
        "A10 admin DELETE su propia inserción (limpieza)",
        !error && (deleted ?? []).length === 1,
        error?.message ?? "",
      );
    } else {
      expect("A10 admin DELETE su propia inserción (limpieza)", false, "no había ID para borrar");
    }
  }
}

async function groupB() {
  section("Grupo B — Cross-tenant isolation");

  const { client: adminClient } = await loginAs(EMAILS.admin);

  // B1: SELECT schedules filtrando por vetB.id → vacío
  {
    const { data } = await adminClient
      .from("member_weekly_schedules")
      .select("id, member_id, org_id")
      .eq("member_id", orgB.vetMember.id);
    expect("B1 admin demo NO ve schedules de vet de org B", (data ?? []).length === 0);
  }

  // B2: INSERT capability apuntando a org_id de org B
  {
    const { data, error } = await adminClient
      .from("member_capabilities")
      .insert({
        org_id: orgB.org.id,
        member_id: orgB.vetMember.id,
        capability: "can_groom",
      })
      .select();
    expect(
      "B2 admin demo NO puede INSERT capability en org B",
      error !== null || (data ?? []).length === 0,
      error?.message ?? "",
    );
  }

  // B3: INSERT con member_id=vetB pero org_id=demoOrg (confundir policy con FK)
  {
    const { data, error } = await adminClient
      .from("member_capabilities")
      .insert({
        org_id: demoOrg.id,
        member_id: orgB.vetMember.id,
        capability: "can_vet",
      })
      .select();
    expect(
      "B3 admin demo NO puede INSERT con member ajeno + su org_id",
      error !== null || (data ?? []).length === 0,
      error?.message ?? "",
    );
  }

  // B4: UPDATE schedule de org B → 0 filas
  {
    const { data } = await adminClient
      .from("member_weekly_schedules")
      .update({ end_time: "23:59:00" })
      .eq("org_id", orgB.org.id)
      .select();
    expect("B4 admin demo UPDATE schedule de org B → 0 filas", (data ?? []).length === 0);
  }

  // B5: DELETE cualquier fila de org B → 0 filas
  {
    const { data: d1 } = await adminClient
      .from("member_weekly_schedules")
      .delete()
      .eq("org_id", orgB.org.id)
      .select();
    const { data: d2 } = await adminClient
      .from("member_schedule_blocks")
      .delete()
      .eq("org_id", orgB.org.id)
      .select();
    const { data: d3 } = await adminClient
      .from("member_capabilities")
      .delete()
      .eq("org_id", orgB.org.id)
      .select();
    expect(
      "B5 admin demo DELETE en cada tabla de org B → 0 filas",
      (d1 ?? []).length === 0 && (d2 ?? []).length === 0 && (d3 ?? []).length === 0,
    );
  }

  // B6: Replica la lógica de getMemberDayAvailability — admin demo consulta
  // schedule + blocks del vetB. RLS debe devolver arrays vacíos. El guard
  // cross-tenant del action (lib/auth/capabilities + org_id check) depende
  // de esta propiedad: si RLS leaked data, el action retornaría info
  // aunque su short-circuit falle.
  {
    const today = new Date().toISOString().slice(0, 10);
    const dayOfWeek = new Date(`${today}T12:00:00`).getDay();
    const { data: tramos } = await adminClient
      .from("member_weekly_schedules")
      .select("start_time, end_time")
      .eq("member_id", orgB.vetMember.id)
      .eq("day_of_week", dayOfWeek);
    const { data: blocks } = await adminClient
      .from("member_schedule_blocks")
      .select("start_date, end_date, reason")
      .eq("member_id", orgB.vetMember.id)
      .lte("start_date", today)
      .gte("end_date", today);
    expect(
      "B6 admin demo NO ve availability (tramos/blocks) de vet org B",
      (tramos ?? []).length === 0 && (blocks ?? []).length === 0,
    );
  }
}

async function groupC() {
  section("Grupo C — Anonymous (sin sesión)");

  const anonClient = makeAnon();

  const tables = [
    "member_weekly_schedules",
    "member_schedule_blocks",
    "member_capabilities",
    "sent_birthday_log",
  ];

  let i = 1;
  for (const t of tables) {
    const { data, error } = await anonClient.from(t).select("*").limit(1);
    const blocked = error !== null || (data ?? []).length === 0;
    expect(`C${i} anon sin acceso a ${t}`, blocked, error?.message ?? "");
    i++;
  }
}

async function groupD() {
  section("Grupo D — Cobertura de políticas (metadatos)");

  // Usamos una RPC ad-hoc vía PostgREST no es posible para pg_policies,
  // así que consultamos vía service_role + SQL crudo usando el endpoint REST:
  // alternativa: crear view pública. Como no hay, usamos pg_catalog vía rpc "exec_sql" si existe,
  // si no, probamos con supabase-js .from("pg_policies")... pg_policies NO está expuesto por PostgREST.
  //
  // Solución portable: usamos el propio cliente con service_role sobre una función SQL estándar.
  // Alternativa implementada: leer las policies listando errores esperados.
  //
  // Para evitar dependencias, utilizamos una aproximación funcional:
  // D1 — existencia: una consulta service_role a cada tabla debe funcionar (tabla existe).
  // D2 — sent_birthday_log: intentar INSERT como admin autenticado debe fallar (no hay policy INSERT).
  // D3 — INSERT policy admin-only: verificado indirectamente por A9 (admin SÍ insertó) + A1/A2/A3 (vet NO).
  //
  // Igualmente, si el proyecto expone pg_policies (algunos SDK lo permiten vía schema 'public'), lo intentamos.

  // D1 — cada tabla existe (service role puede leer 0+ filas sin error)
  const tables = [
    "member_weekly_schedules",
    "member_schedule_blocks",
    "member_capabilities",
    "sent_birthday_log",
  ];
  let allExist = true;
  for (const t of tables) {
    const { error } = await svc.from(t).select("*", { count: "exact", head: true });
    if (error) allExist = false;
  }
  expect("D1 las 4 tablas existen (svc puede acceder sin error)", allExist);

  // D2 — sent_birthday_log: admin autenticado NO puede INSERT (no hay policy INSERT/UPDATE/DELETE)
  {
    const { client: adminClient } = await loginAs(EMAILS.admin);
    const today = new Date().toISOString().slice(0, 10);

    // Buscar un pet_id real de la org demo
    const { data: pets } = await svc.from("pets").select("id").eq("org_id", demoOrg.id).limit(1);
    const petId = pets?.[0]?.id;

    if (!petId) {
      expect("D2 sent_birthday_log NO admite INSERT autenticado (admin)", false, "no hay pets para probar");
    } else {
      const { data, error } = await adminClient
        .from("sent_birthday_log")
        .insert({ pet_id: petId, sent_on: today })
        .select();
      expect(
        "D2 sent_birthday_log NO admite INSERT autenticado (admin)",
        error !== null || (data ?? []).length === 0,
        error?.message ?? "",
      );
    }
  }

  // D3 — INSERT con with_check admin-only validado indirectamente: vet falló en A1/A2/A3 y admin pasó en A9.
  // Aquí verificamos por redundancia que groomer tampoco puede insertar schedule.
  {
    const { client: groomerClient } = await loginAs(EMAILS.groomer);
    const { data, error } = await groomerClient
      .from("member_weekly_schedules")
      .insert({
        org_id: demoOrg.id,
        member_id: demoMembers.groomer.id,
        day_of_week: 5,
        start_time: "09:00:00",
        end_time: "13:00:00",
      })
      .select();
    expect(
      "D3 policy INSERT (with_check) admin-only: groomer bloqueado también",
      error !== null || (data ?? []).length === 0,
      error?.message ?? "",
    );
  }
}

async function groupE() {
  section("Grupo E — Exclusion constraint (TOCTOU)");

  // E1: dos citas activas solapadas para el mismo profesional → segunda debe
  // fallar con código 23P01 (exclusion_violation) gracias al constraint
  // appointments_no_overlap del Fix Alto. Probamos con service_role para
  // aislar el constraint DB de cualquier lógica de aplicación.

  const { data: pets } = await svc
    .from("pets")
    .select("id, client_id")
    .eq("org_id", demoOrg.id)
    .limit(1);
  const pet = pets?.[0];
  if (!pet) {
    expect("E1 setup: pet de demo disponible", false, "no hay pets en clinica-demo");
    return;
  }

  // Usar fecha futura en TZ Chile para evitar colisión con citas seed/pasadas.
  // +30 días futuros es suficientemente lejos.
  const future = new Date(Date.now() + 30 * 86400000)
    .toISOString()
    .slice(0, 10);
  const vetId = demoMembers.vet.id;

  const base = {
    org_id: demoOrg.id,
    client_id: pet.client_id,
    pet_id: pet.id,
    assigned_to: vetId,
    type: "medical",
    status: "pending",
    date: future,
  };

  // Insert cita 1
  const { data: first, error: e1 } = await svc
    .from("appointments")
    .insert({ ...base, start_time: "10:00:00", end_time: "11:00:00" })
    .select("id")
    .single();

  if (e1 || !first) {
    expect("E1 setup: primera cita insertada", false, e1?.message ?? "unknown");
    return;
  }

  try {
    // Insert cita 2 solapada: 10:30-11:30 cruza con 10:00-11:00
    const { error: e2 } = await svc
      .from("appointments")
      .insert({ ...base, start_time: "10:30:00", end_time: "11:30:00" });

    expect(
      "E1 constraint appointments_no_overlap rechaza cita solapada",
      e2 !== null && e2.code === "23P01",
      e2 ? `code=${e2.code} msg=${e2.message}` : "sin error cuando debía haber",
    );

    // E2: cita solapada pero con status='cancelled' en la primera → el
    // predicate index excluye canceladas, así que el segundo insert SÍ puede.
    await svc
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", first.id);

    const { data: third, error: e3 } = await svc
      .from("appointments")
      .insert({ ...base, start_time: "10:30:00", end_time: "11:30:00" })
      .select("id")
      .single();

    expect(
      "E2 constraint ignora canceladas (se puede reagendar slot liberado)",
      e3 === null && third !== null,
      e3?.message ?? "",
    );

    if (third) {
      await svc.from("appointments").delete().eq("id", third.id);
    }
  } finally {
    // Cleanup de la primera cita
    await svc.from("appointments").delete().eq("id", first.id);
  }
}

// ---------------------------------------------------------------
// Runner
// ---------------------------------------------------------------
async function main() {
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║  Sprint 4 — RLS / Privilege escalation tests     ║");
  console.log("╚══════════════════════════════════════════════════╝");

  await detectBlockColumns();
  console.log(`ℹ member_schedule_blocks usa columnas: ${blockDateCol === "date" ? "start_date/end_date" : "start_at/end_at"}`);

  await loadDemoOrg();
  console.log(`✓ Org demo: ${demoOrg.name} (${demoOrg.id})`);

  await createOrgB();
  console.log(`✓ Org B temporal: ${orgB.org.slug} (${orgB.org.id})`);

  await groupA();
  await groupB();
  await groupC();
  await groupD();
  await groupE();
}

try {
  await main();
} catch (e) {
  console.error("\n❌ Setup/Run failed:", e.message);
  fail++;
  failures.push(`SETUP: ${e.message}`);
} finally {
  await cleanupOrgB();

  const summary = ` PASS: ${pass}   FAIL: ${fail} `;
  const line = "═".repeat(summary.length);
  console.log(`\n╔${line}╗`);
  console.log(`║${summary}║`);
  console.log(`╚${line}╝`);

  if (failures.length) {
    console.log("\nFallos:");
    for (const f of failures) console.log(`  • ${f}`);
  }

  process.exit(fail > 0 ? 1 : 0);
}
