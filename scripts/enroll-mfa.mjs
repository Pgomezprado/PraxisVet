/**
 * Enrolar MFA (TOTP) para un usuario de PraxisVet.
 *
 * Uso:
 *   node scripts/enroll-mfa.mjs <email> <password> [friendlyName]
 *
 * Ejemplo:
 *   node scripts/enroll-mfa.mjs gomezpablo.mayor@gmail.com 'Pablito041994!' 'Pablo TOTP'
 *
 * Qué hace:
 *   1) Inicia sesión con email/password (cliente anon, flujo normal).
 *   2) Llama a supabase.auth.mfa.enroll({ factorType: 'totp' }) — Supabase
 *      devuelve un secret + un QR code en data-URL.
 *   3) Imprime:
 *        - El secret (para ingresar manualmente en Google Authenticator).
 *        - El QR en formato otpauth:// (copialo y pegalo en un generador
 *          de QR online si no querés escanear la imagen).
 *        - El factor_id (guárdalo, lo necesitás para `challenge + verify`).
 *   4) Pide por stdin el código de 6 dígitos que muestra la app.
 *   5) Llama a challenge + verify. Si verifica, el factor queda
 *      VERIFICADO (no solo "unverified"), que es el estado que AAL2
 *      reconoce al hacer login.
 *   6) Con el service-role, actualiza platform_admins.mfa_enrolled_at = now()
 *      para el user.
 *
 * Nota: requiere que el usuario ya exista en auth.users. Si no existe,
 * correr antes `node scripts/seed-superadmin.mjs`.
 *
 * Alternativa vía UI (si preferís): cualquier página autenticada con un
 * formulario de MFA (Settings → Seguridad) llama a los mismos métodos
 * (`supabase.auth.mfa.enroll` + `challenge` + `verify`). PraxisVet aún
 * no tiene esa pantalla, por eso este script.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";

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
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

const [emailArg, passwordArg, friendlyNameArg] = process.argv.slice(2);
if (!emailArg || !passwordArg) {
  console.error("Uso: node scripts/enroll-mfa.mjs <email> <password> [friendlyName]");
  process.exit(1);
}

const friendlyName = friendlyNameArg ?? "PraxisVet TOTP";

async function main() {
  // 1) Cliente anon para flujo de sesión normal.
  const anon = createClient(url, anonKey, { auth: { persistSession: false } });

  console.log(`→ Login como ${emailArg}...`);
  const { data: signInData, error: signInErr } = await anon.auth.signInWithPassword({
    email: emailArg,
    password: passwordArg,
  });
  if (signInErr || !signInData.session) {
    throw new Error(`Login falló: ${signInErr?.message ?? "sin sesión"}`);
  }
  const userId = signInData.user.id;
  console.log(`  Sesión iniciada. user_id=${userId}`);

  // 2) Enroll TOTP.
  console.log("→ Enrolando factor TOTP...");
  const { data: enrollData, error: enrollErr } = await anon.auth.mfa.enroll({
    factorType: "totp",
    friendlyName,
  });
  if (enrollErr || !enrollData) {
    throw new Error(`Enroll falló: ${enrollErr?.message ?? "sin data"}`);
  }

  const factorId = enrollData.id;
  const secret = enrollData.totp?.secret;
  const otpauthUri = enrollData.totp?.uri;

  console.log("\n=========== ENROLAMIENTO TOTP ===========");
  console.log(` Factor ID: ${factorId}`);
  console.log(` Friendly name: ${friendlyName}`);
  console.log(` Secret (ingresar manual): ${secret}`);
  console.log(` otpauth URI (convertir en QR):\n   ${otpauthUri}`);
  console.log("=========================================");
  console.log(" Escaneá el QR con Google Authenticator, Authy o 1Password.");
  console.log(" Podés generar un QR online pegando la otpauth URI en:");
  console.log("   https://www.the-qrcode-generator.com/  (pegá como texto)");
  console.log("");

  // 3) Leer código de la app.
  const rl = readline.createInterface({ input: stdin, output: stdout });
  const code = (await rl.question("Código de 6 dígitos de la app: ")).trim();
  rl.close();

  if (!/^\d{6}$/.test(code)) {
    throw new Error("Código inválido. Debe ser 6 dígitos.");
  }

  // 4) Challenge + verify.
  console.log("→ Creando challenge...");
  const { data: challengeData, error: challengeErr } = await anon.auth.mfa.challenge({
    factorId,
  });
  if (challengeErr || !challengeData) {
    throw new Error(`Challenge falló: ${challengeErr?.message ?? "sin data"}`);
  }

  console.log("→ Verificando código...");
  const { data: verifyData, error: verifyErr } = await anon.auth.mfa.verify({
    factorId,
    challengeId: challengeData.id,
    code,
  });
  if (verifyErr) {
    throw new Error(`Verify falló: ${verifyErr.message}`);
  }
  console.log(`✓ Factor verificado. Nuevo AAL: ${verifyData?.access_token ? "aal2" : "(revisá sesión)"}`);

  // 5) Actualizar platform_admins.mfa_enrolled_at si aplica.
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: paRow } = await admin
    .from("platform_admins")
    .select("user_id, mfa_enrolled_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (paRow) {
    const { error: updErr } = await admin
      .from("platform_admins")
      .update({ mfa_enrolled_at: new Date().toISOString() })
      .eq("user_id", userId);
    if (updErr) {
      console.warn(`  ⚠ No se pudo actualizar mfa_enrolled_at: ${updErr.message}`);
    } else {
      console.log("→ platform_admins.mfa_enrolled_at actualizado a now().");
    }
  } else {
    console.log("  (Usuario no es platform admin — no se toca platform_admins.)");
  }

  console.log("\n✓ Listo. El próximo login pedirá el código TOTP.");
  console.log("  La sesión autenticada con MFA tendrá AAL2 y podrá entrar al panel /superadmin.");
}

main().catch((e) => {
  console.error("ERROR:", e.message ?? e);
  process.exit(1);
});
