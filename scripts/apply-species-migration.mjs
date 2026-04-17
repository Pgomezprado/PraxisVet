/**
 * Aplica la migración 20260415000001_species_clinical_taxonomy.sql
 * directamente contra la base de datos Postgres de Supabase.
 *
 * Requiere una de estas variables en .env.local o en el entorno:
 *   - SUPABASE_DB_URL  (ej: postgres://postgres:<pwd>@db.<ref>.supabase.co:5432/postgres)
 *   - DATABASE_URL
 *
 * Uso:
 *   node scripts/apply-species-migration.mjs
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
    "❌ Falta SUPABASE_DB_URL o DATABASE_URL en el entorno o en .env.local",
  );
  process.exit(1);
}

const sql = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260415000001_species_clinical_taxonomy.sql",
  ),
  "utf8",
);

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log("→ Conectado. Aplicando migración…");
  await client.query(sql);
  const { rows } = await client.query(
    "SELECT species, count(*)::int AS n FROM public.pets GROUP BY species ORDER BY species",
  );
  console.log("✓ Migración aplicada. Distribución actual de species:");
  console.table(rows);
} catch (err) {
  console.error("❌ Falló la migración:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
