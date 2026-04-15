import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), ".env.local"), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key, { auth: { persistSession: false } });

const EMAIL = "admin@praxisvet.dev";
const PASSWORD = "Pablito041994!";
const ORG_SLUG = "clinica-demo";

const { data: created, error: userErr } = await supabase.auth.admin.createUser({
  email: EMAIL,
  password: PASSWORD,
  email_confirm: true,
});
if (userErr && !String(userErr.message).includes("already")) throw userErr;

let userId = created?.user?.id;
if (!userId) {
  const { data: list } = await supabase.auth.admin.listUsers();
  userId = list.users.find((u) => u.email === EMAIL)?.id;
}
if (!userId) throw new Error("no user id");

const { data: existingOrg } = await supabase
  .from("organizations")
  .select("id, slug")
  .eq("slug", ORG_SLUG)
  .maybeSingle();

let orgId = existingOrg?.id;
if (!orgId) {
  const { data: org, error: orgErr } = await supabase
    .from("organizations")
    .insert({
      name: "Clinica Demo",
      slug: ORG_SLUG,
      phone: "+56 9 1234 5678",
      address: "Av. Providencia 123, Santiago",
    })
    .select("id")
    .single();
  if (orgErr) throw orgErr;
  orgId = org.id;
}

const { error: memberErr } = await supabase
  .from("organization_members")
  .upsert(
    {
      org_id: orgId,
      user_id: userId,
      role: "admin",
      first_name: "Pablo",
      last_name: "Gomez",
    },
    { onConflict: "org_id,user_id" },
  );
if (memberErr) throw memberErr;

console.log(JSON.stringify({ email: EMAIL, password: PASSWORD, slug: ORG_SLUG, userId, orgId }, null, 2));
