/**
 * Guardas de seguridad para scripts que tocan la base de datos.
 *
 * Tres protecciones:
 *   1. Detectar SQL destructivo (DROP, TRUNCATE, DELETE sin WHERE).
 *   2. Confirmación obligatoria antes de tocar producción.
 *   3. Bloqueo: scripts de seed/test no pueden correr contra prod.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline";

// ---------------------------------------------------------------
// Carga .env.local (común a todos los scripts)
// ---------------------------------------------------------------
export function loadEnv() {
  try {
    return Object.fromEntries(
      readFileSync(resolve(process.cwd(), ".env.local"), "utf8")
        .split("\n")
        .filter((l) => l && !l.startsWith("#") && l.includes("="))
        .map((l) => {
          const i = l.indexOf("=");
          return [
            l.slice(0, i).trim(),
            l.slice(i + 1).trim().replace(/^"|"$/g, ""),
          ];
        }),
    );
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------
// Extrae el host de un connection string o URL https
// ---------------------------------------------------------------
export function hostOf(connStr) {
  if (!connStr) return null;
  try {
    return new URL(connStr).hostname.toLowerCase();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------
// Extrae el "ref" del proyecto Supabase de un connection string.
// Cubre tres formatos:
//   - postgres://postgres:<pwd>@db.<ref>.supabase.co:5432/postgres   (directo)
//   - postgres://postgres.<ref>:<pwd>@aws-1-...pooler.supabase.com   (pooler)
//   - https://<ref>.supabase.co                                      (REST)
// ---------------------------------------------------------------
export function projectRef(connStr) {
  if (!connStr) return null;
  try {
    const u = new URL(connStr);
    // Pooler: username = "postgres.<ref>"
    const userMatch = decodeURIComponent(u.username || "").match(/^postgres\.([a-z0-9]+)$/i);
    if (userMatch) return userMatch[1].toLowerCase();
    // Directo o REST: hostname = "db.<ref>.supabase.co" o "<ref>.supabase.co"
    const hostMatch = u.hostname.toLowerCase().match(/^(?:db\.)?([a-z0-9]+)\.supabase\.co$/);
    if (hostMatch) return hostMatch[1];
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------
// Detecta SQL destructivo. Retorna lista de líneas problemáticas.
//
// Patrones bloqueados:
//   - DROP DATABASE / DROP SCHEMA / DROP TABLE / DROP ROLE
//   - TRUNCATE
//   - DELETE FROM ... sin WHERE
//   - ALTER TABLE ... DROP COLUMN (sin IF EXISTS no es suficiente,
//     pero al menos lo flageamos para confirmación explícita)
//
// IGNORA contenido dentro de comentarios -- y / * * / .
// ---------------------------------------------------------------
const DESTRUCTIVE_PATTERNS = [
  { name: "DROP DATABASE", re: /\bdrop\s+database\b/i },
  { name: "DROP SCHEMA", re: /\bdrop\s+schema\b/i },
  { name: "DROP TABLE", re: /\bdrop\s+table\b/i },
  { name: "DROP ROLE", re: /\bdrop\s+role\b/i },
  { name: "DROP USER", re: /\bdrop\s+user\b/i },
  { name: "TRUNCATE", re: /\btruncate\b/i },
  { name: "DROP COLUMN", re: /\bdrop\s+column\b/i },
];

function stripSqlComments(sql) {
  // Quita comentarios -- hasta fin de línea y / * ... * /
  return sql
    .replace(/--[^\n]*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
}

export function scanDestructive(sql) {
  const clean = stripSqlComments(sql);
  const findings = [];

  for (const { name, re } of DESTRUCTIVE_PATTERNS) {
    if (re.test(clean)) findings.push(name);
  }

  // DELETE FROM <tabla> ; — sin WHERE
  // Buscamos "DELETE FROM xxx" seguido por ; o EOL sin que aparezca WHERE en el mismo statement.
  const deleteRe = /\bdelete\s+from\s+[a-z0-9_."]+(?![^;]*\bwhere\b)/gi;
  if (deleteRe.test(clean)) findings.push("DELETE FROM ... sin WHERE");

  return [...new Set(findings)];
}

// ---------------------------------------------------------------
// Pregunta interactiva Y/N por stdin. Acepta solo "y"/"yes"/"si".
// ---------------------------------------------------------------
export async function confirmOrAbort(message) {
  if (!process.stdin.isTTY) {
    console.error(
      `\n❌ Confirmación requerida pero no hay TTY. Pasa --yes para autorizar.`,
    );
    process.exit(1);
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((res) =>
    rl.question(`${message} [y/N] `, (a) => {
      rl.close();
      res(a.trim().toLowerCase());
    }),
  );
  if (!["y", "yes", "si", "sí"].includes(answer)) {
    console.log("Cancelado.");
    process.exit(0);
  }
}

// ---------------------------------------------------------------
// Bloqueo duro: rechaza el script si la URL apunta a prod.
//
// "Es prod" si:
//   - el host coincide con el de SUPABASE_DB_URL_PROD, o
//   - el env tiene NEXT_PUBLIC_SUPABASE_URL_PROD y coincide.
//
// Uso típico en seeds/tests:
//   assertNotProd(env.NEXT_PUBLIC_SUPABASE_URL, env, "seed-demo");
// ---------------------------------------------------------------
export function assertNotProd(targetUrl, env, scriptName) {
  const targetRef = projectRef(targetUrl);
  if (!targetRef) return;

  const prodRefs = [
    projectRef(env.SUPABASE_DB_URL_PROD),
    projectRef(env.NEXT_PUBLIC_SUPABASE_URL_PROD),
    projectRef(process.env.SUPABASE_DB_URL_PROD),
    projectRef(process.env.NEXT_PUBLIC_SUPABASE_URL_PROD),
  ].filter(Boolean);

  if (prodRefs.includes(targetRef)) {
    console.error(
      `\n❌ ${scriptName}: este script está apuntando al proyecto de PRODUCCIÓN (ref=${targetRef}).`,
    );
    console.error(
      `   Solo puede correr contra dev. Revisa NEXT_PUBLIC_SUPABASE_URL en .env.local.`,
    );
    process.exit(1);
  }
}

// ---------------------------------------------------------------
// Sanity check para migrate.mjs: dev y prod no pueden ser el mismo host.
// ---------------------------------------------------------------
export function assertDevProdDistinct(env) {
  const dev = projectRef(env.SUPABASE_DB_URL || env.DATABASE_URL);
  const prod = projectRef(env.SUPABASE_DB_URL_PROD);
  if (dev && prod && dev === prod) {
    console.error(
      `\n❌ Configuración corrupta: SUPABASE_DB_URL y SUPABASE_DB_URL_PROD apuntan al MISMO proyecto (ref=${dev}).`,
    );
    console.error(`   Revisa .env.local antes de continuar.`);
    process.exit(1);
  }
}
