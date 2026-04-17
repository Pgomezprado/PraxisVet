/**
 * Seed superadmin — inserta a Pablo en platform_admins.
 *
 * Uso:
 *   node scripts/seed-superadmin.mjs [email]
 *
 * Si el email ya existe en auth.users, lo marca como platform admin
 * owner. Si no existe todavía, crea el usuario con password temporal y
 * lo marca. Idempotente: upsert sobre platform_admins.user_id.
 *
 * Fase 1: mfa_enrolled_at se llena con now() por defecto para que la
 * función is_platform_admin() funcione tanto en modo soft como en el
 * modo estricto original.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

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

const EMAIL = process.argv[2] ?? "gomezpablo.mayor@gmail.com";
const TEMP_PASSWORD = "Pablito041994!";

async function findUserByEmail(email) {
  // listUsers pagina; buscamos hasta agotar o encontrar.
  let page = 1;
  while (true) {
    const { data, error } = await s.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit) return hit;
    if (data.users.length < 200) return null;
    page += 1;
  }
}

async function main() {
  console.log(`→ Buscando usuario ${EMAIL}...`);
  let user = await findUserByEmail(EMAIL);

  if (!user) {
    console.log("  No existe. Creando usuario auth...");
    const { data, error } = await s.auth.admin.createUser({
      email: EMAIL,
      password: TEMP_PASSWORD,
      email_confirm: true,
      user_metadata: { first_name: "Pablo", last_name: "Gomez" },
    });
    if (error) throw error;
    user = data.user;
    console.log(`  Usuario creado: ${user.id}`);
    console.log(`  Password temporal: ${TEMP_PASSWORD}`);
  } else {
    console.log(`  Usuario encontrado: ${user.id}`);
  }

  console.log("→ Upsert en platform_admins (owner, MFA marcado)...");
  const { error: upsertErr } = await s.from("platform_admins").upsert(
    {
      user_id: user.id,
      role: "owner",
      mfa_enrolled_at: new Date().toISOString(),
      notes: "Founder · seed Fase 1",
    },
    { onConflict: "user_id" },
  );
  if (upsertErr) throw upsertErr;

  console.log("→ Marcando app_metadata.platform_admin = true...");
  const { error: metaErr } = await s.auth.admin.updateUserById(user.id, {
    app_metadata: { ...(user.app_metadata ?? {}), platform_admin: true },
  });
  if (metaErr) throw metaErr;

  console.log("✓ Listo. Prueba con:");
  console.log(`    email: ${EMAIL}`);
  if (user.email_confirmed_at || user.confirmed_at) {
    console.log("    (usa tu contraseña existente)");
  } else {
    console.log(`    password temporal: ${TEMP_PASSWORD}`);
  }
}

main().catch((e) => {
  console.error("ERROR:", e.message ?? e);
  process.exit(1);
});
