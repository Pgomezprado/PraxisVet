/**
 * Aplica un archivo SQL (o una migración por nombre) contra la DB de Supabase.
 *
 * Uso:
 *   node scripts/apply-sql.mjs supabase/migrations/20260416000002_vaccines_catalog_dewormings_reminders.sql
 *   node scripts/apply-sql.mjs supabase/seed/vaccines_catalog.sql
 *
 * Requiere una de estas variables (en entorno o .env.local):
 *   - SUPABASE_DB_URL  (ej: postgres://postgres:<pwd>@db.<ref>.supabase.co:5432/postgres)
 *   - DATABASE_URL
 */

import { Client } from "pg";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  loadEnv,
  hostOf,
  scanDestructive,
  confirmOrAbort,
} from "./lib/db-guard.mjs";

const args = process.argv.slice(2);
const relPath = args.find((a) => !a.startsWith("--"));
const allowDestructive = args.includes("--allow-destructive");
const autoYes = args.includes("--yes");

const env = loadEnv();

const connectionString =
  process.env.SUPABASE_DB_URL ||
  process.env.DATABASE_URL ||
  env.SUPABASE_DB_URL ||
  env.DATABASE_URL;

if (!connectionString) {
  console.error(
    "Falta SUPABASE_DB_URL o DATABASE_URL en el entorno o en .env.local",
  );
  process.exit(1);
}

if (!relPath) {
  console.error(
    "Uso: node scripts/apply-sql.mjs <ruta-al-sql> [--allow-destructive] [--yes]",
  );
  process.exit(1);
}

const sql = readFileSync(resolve(process.cwd(), relPath), "utf8");

// ---------------------------------------------------------------
// Guard 1: bloqueo de SQL destructivo
// ---------------------------------------------------------------
const findings = scanDestructive(sql);
if (findings.length > 0) {
  console.error(
    `\n⚠️  ${relPath} contiene SQL destructivo: ${findings.join(", ")}`,
  );
  if (!allowDestructive) {
    console.error(
      `   Bloqueado. Si REALMENTE quieres aplicarlo, pasa --allow-destructive --yes.`,
    );
    process.exit(1);
  }
  if (!autoYes) {
    console.error(
      `\n   Target: ${hostOf(connectionString)}`,
    );
    await confirmOrAbort(`   ¿Aplicar SQL destructivo contra esta base?`);
  }
}

const u = new URL(connectionString);
const client = new Client({
  host: u.hostname,
  port: Number(u.port || 5432),
  user: decodeURIComponent(u.username),
  password: decodeURIComponent(u.password),
  database: u.pathname.replace(/^\//, "") || "postgres",
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log(`Aplicando ${relPath}...`);
  await client.query(sql);
  console.log("OK:", relPath);
} catch (err) {
  console.error("Falló:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
