import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), ".env.local"), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")]; }),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(url, key, { auth: { persistSession: false } });

async function count(table) {
  const { count, error } = await sb.from(table).select("*", { count: "exact", head: true });
  return error ? `ERR ${error.message}` : count;
}

async function sample(table, cols = "*", limit = 50) {
  const { data, error } = await sb.from(table).select(cols).limit(limit);
  return error ? `ERR ${error.message}` : data;
}

console.log("=== Conteos de tablas nuevas ===");
for (const t of ["vaccines_catalog","vaccine_protocols","vaccine_protocol_doses","organization_vaccine_preferences","dewormings","reminders"]) {
  console.log(`${t}: ${await count(t)}`);
}

console.log("\n=== Catálogo de vacunas ===");
console.table(await sample("vaccines_catalog", "code,name,species,is_active"));

console.log("\n=== Protocolos caninos ===");
console.table(await sample("vaccine_protocols", "code,name,species,life_stage"));

console.log("\n=== Dosis (todas, ordenadas) ===");
const doses = await sample("vaccine_protocol_doses", "protocol_id,sequence,name,interval_days", 100);
const protos = await sample("vaccine_protocols", "id,code", 100);
const protoMap = Object.fromEntries(protos.map(p => [p.id, p.code]));
console.table(
  doses.map(d => ({ protocol: protoMap[d.protocol_id], seq: d.sequence, name: d.name, interval_days: d.interval_days }))
       .sort((a,b)=> a.protocol.localeCompare(b.protocol) || a.seq - b.seq)
);

console.log("\n=== Columnas nuevas en clinical_records (probar select) ===");
const { data: cr, error: crErr } = await sb.from("clinical_records").select("id,respiratory_rate,capillary_refill_seconds,skin_fold_seconds,physical_exam").limit(1);
console.log(crErr ? `ERR ${crErr.message}` : "OK: columnas accesibles", cr);

console.log("\n=== Columnas nuevas en vaccinations ===");
const { data: vx, error: vxErr } = await sb.from("vaccinations").select("id,vaccine_catalog_id,protocol_id,dose_id").limit(1);
console.log(vxErr ? `ERR ${vxErr.message}` : "OK: columnas accesibles", vx);
