/**
 * Sincroniza migraciones entre los proyectos Supabase de dev y producción.
 *
 * Workflow típico:
 *   1. Escribes una nueva migración en `supabase/migrations/YYYYMMDDHHMMSS_xxx.sql`.
 *   2. `npm run db:migrate` → la aplica en dev.
 *   3. Cuando esté listo, `npm run db:migrate:prod` → la aplica en prod.
 *   4. El script mantiene una tabla `_applied_migrations` en cada DB con el
 *      registro de qué se aplicó y cuándo, así nunca se ejecuta dos veces.
 *
 * Comandos disponibles (ver package.json):
 *   db:migrate              → aplica pendientes en dev
 *   db:migrate:prod         → aplica pendientes en prod
 *   db:migrate:dry          → lista pendientes en dev sin ejecutar
 *   db:migrate:dry:prod     → lista pendientes en prod sin ejecutar
 *   db:migrate:init         → marca TODAS las migraciones como aplicadas en dev
 *                             (úsalo la primera vez, cuando ya estaban aplicadas
 *                             manualmente y necesitas establecer baseline)
 *   db:migrate:init:prod    → idem para prod
 *
 * Variables de entorno requeridas en .env.local:
 *   SUPABASE_DB_URL       → conexión postgres al proyecto dev
 *   SUPABASE_DB_URL_PROD  → conexión postgres al proyecto prod (obtenla en
 *                           Supabase Dashboard → Project Settings → Database
 *                           → Connection string → modo "URI" con tu password)
 */

import { Client } from "pg";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import {
  loadEnv,
  hostOf,
  scanDestructive,
  confirmOrAbort,
  assertDevProdDistinct,
} from "./lib/db-guard.mjs";

const args = process.argv.slice(2);
const envFlag = args.find((a) => a.startsWith("--env="))?.split("=")[1] ?? "dev";
const dryRun = args.includes("--dry-run");
const initBaseline = args.includes("--init-baseline");
const allowDestructive = args.includes("--allow-destructive");
const autoYes = args.includes("--yes");

if (!["dev", "prod"].includes(envFlag)) {
  console.error("--env debe ser 'dev' o 'prod'");
  process.exit(1);
}

// Load .env.local
const env = loadEnv();

// Guard: dev y prod no pueden ser el mismo host (config corrupta)
assertDevProdDistinct(env);

const urlByEnv = {
  dev:
    process.env.SUPABASE_DB_URL ||
    process.env.DATABASE_URL ||
    env.SUPABASE_DB_URL ||
    env.DATABASE_URL,
  prod: process.env.SUPABASE_DB_URL_PROD || env.SUPABASE_DB_URL_PROD,
};

const connectionString = urlByEnv[envFlag];
if (!connectionString) {
  const varName = envFlag === "prod" ? "SUPABASE_DB_URL_PROD" : "SUPABASE_DB_URL";
  console.error(
    `Falta ${varName} en .env.local.\n` +
      (envFlag === "prod"
        ? "Para obtenerla: Supabase Dashboard del proyecto prod → Settings → Database → Connection string → URI (con password)."
        : "Para obtenerla: Supabase Dashboard del proyecto dev → Settings → Database → Connection string → URI (con password).")
  );
  process.exit(1);
}

// Build pg client from the connection string
const u = new URL(connectionString);
const client = new Client({
  host: u.hostname,
  port: Number(u.port || 5432),
  user: decodeURIComponent(u.username),
  password: decodeURIComponent(u.password),
  database: u.pathname.replace(/^\//, "") || "postgres",
  ssl: { rejectUnauthorized: false },
});

const MIGRATIONS_DIR = resolve(process.cwd(), "supabase/migrations");
const files = readdirSync(MIGRATIONS_DIR)
  // Excluimos full_schema.sql — no es una migración, es un dump de referencia
  .filter((f) => f.endsWith(".sql") && !f.startsWith("full_"))
  .sort();

console.log(`\n[migrate] env=${envFlag} · host=${u.hostname.slice(0, 30)}...`);

try {
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS public._applied_migrations (
      filename text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  if (initBaseline) {
    let inserted = 0;
    for (const f of files) {
      const res = await client.query(
        "INSERT INTO public._applied_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING",
        [f]
      );
      if (res.rowCount) inserted++;
    }
    console.log(
      `✓ Baseline: marcadas ${inserted} migraciones como aplicadas en ${envFlag} (${files.length - inserted} ya estaban registradas).`
    );
    console.log(
      "  A partir de ahora, nuevas migraciones se aplicarán con 'npm run db:migrate[:prod]'."
    );
    await client.end();
    process.exit(0);
  }

  const { rows } = await client.query(
    "SELECT filename FROM public._applied_migrations"
  );
  const applied = new Set(rows.map((r) => r.filename));
  const pending = files.filter((f) => !applied.has(f));

  if (pending.length === 0) {
    console.log(`✓ ${envFlag} está al día (0 pendientes, ${applied.size} aplicadas).`);
    await client.end();
    process.exit(0);
  }

  console.log(`${pending.length} migración(es) pendiente(s) en ${envFlag}:`);
  pending.forEach((f) => console.log(`  - ${f}`));

  if (dryRun) {
    console.log("\n(dry-run: no se aplicó nada)");
    await client.end();
    process.exit(0);
  }

  // ---------------------------------------------------------------
  // Guard: detectar SQL destructivo en migraciones pendientes
  // ---------------------------------------------------------------
  const destructive = [];
  for (const f of pending) {
    const sqlContent = readFileSync(join(MIGRATIONS_DIR, f), "utf8");
    const findings = scanDestructive(sqlContent);
    if (findings.length > 0) {
      destructive.push({ file: f, findings });
    }
  }
  if (destructive.length > 0) {
    console.log(`\n⚠️  Migraciones con SQL destructivo:`);
    for (const d of destructive) {
      console.log(`   ${d.file} → ${d.findings.join(", ")}`);
    }
    if (!allowDestructive) {
      console.error(
        `\n   Bloqueado. Para aplicar, pasa --allow-destructive --yes.`,
      );
      await client.end();
      process.exit(1);
    }
  }

  // ---------------------------------------------------------------
  // Guard: confirmación obligatoria en prod
  // ---------------------------------------------------------------
  if (envFlag === "prod" && !autoYes) {
    console.log(`\n⚠️  Vas a aplicar ${pending.length} migración(es) en PRODUCCIÓN`);
    console.log(`   Host: ${u.hostname}`);
    await confirmOrAbort(`   ¿Continuar?`);
  }

  for (const f of pending) {
    const sql = readFileSync(join(MIGRATIONS_DIR, f), "utf8");
    process.stdout.write(`→ ${f} ... `);
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query(
        "INSERT INTO public._applied_migrations (filename) VALUES ($1)",
        [f]
      );
      await client.query("COMMIT");
      console.log("OK");
    } catch (err) {
      await client.query("ROLLBACK");
      console.log("FALLÓ");
      console.error(`\n[migrate] Error aplicando ${f}:\n  ${err.message}`);
      await client.end();
      process.exit(1);
    }
  }

  console.log(`\n✓ ${pending.length} migración(es) aplicada(s) en ${envFlag}.`);
} catch (err) {
  console.error(`\n[migrate] Error: ${err.message}`);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
