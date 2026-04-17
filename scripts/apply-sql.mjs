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

const env = (() => {
  try {
    return Object.fromEntries(
      readFileSync(resolve(process.cwd(), ".env.local"), "utf8")
        .split("\n")
        .filter((l) => l && !l.startsWith("#") && l.includes("="))
        .map((l) => {
          const i = l.indexOf("=");
          return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")];
        }),
    );
  } catch {
    return {};
  }
})();

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

const relPath = process.argv[2];
if (!relPath) {
  console.error("Uso: node scripts/apply-sql.mjs <ruta-al-sql>");
  process.exit(1);
}

const sql = readFileSync(resolve(process.cwd(), relPath), "utf8");

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
