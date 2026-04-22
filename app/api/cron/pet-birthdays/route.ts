import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin.server";
import { sendPetBirthdayEmail } from "@/lib/email/pet-birthday";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Daily cron — recordatorios de cumpleaños de mascotas.
 *
 * 1. Query mascotas activas cuya birthdate (MM-DD) coincide con hoy.
 * 2. Solo envía si la org tiene `pet_birthday_reminders_enabled = true`
 *    y el cliente tiene email.
 * 3. Idempotente: inserta en `sent_birthday_log` antes de enviar; si ya
 *    existe fila (pet_id, sent_on), skipea.
 *
 * Auth: Bearer CRON_SECRET header (mismo patrón que trial-reminders).
 */
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 }
    );
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const month = today.getMonth() + 1;
  const day = today.getDate();

  const { data: pets, error } = await supabase
    .from("pets")
    .select(
      `
      id, name, birthdate, org_id,
      client:clients!client_id (id, first_name, last_name, email),
      org:organizations!org_id (id, name, slug, pet_birthday_reminders_enabled)
    `
    )
    .eq("active", true)
    .not("birthdate", "is", null);

  if (error) {
    return NextResponse.json(
      { error: `supabase: ${error.message}` },
      { status: 500 }
    );
  }

  let sent = 0;
  let skipped = 0;

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://praxisvet.cl";

  for (const pet of pets ?? []) {
    if (!pet.birthdate) {
      skipped++;
      continue;
    }

    // Match por MM-DD de la birthdate.
    const bd = new Date(`${pet.birthdate}T12:00:00`);
    if (bd.getMonth() + 1 !== month || bd.getDate() !== day) {
      skipped++;
      continue;
    }

    const org = pet.org as unknown as {
      id: string;
      name: string;
      slug: string;
      pet_birthday_reminders_enabled: boolean;
    } | null;

    if (!org || !org.pet_birthday_reminders_enabled) {
      skipped++;
      continue;
    }

    const client = pet.client as unknown as {
      id: string;
      first_name: string;
      last_name: string;
      email: string | null;
    } | null;

    if (!client?.email) {
      skipped++;
      continue;
    }

    // Idempotencia: chequea el log ANTES de enviar. Si ya existe, skip.
    // Enviar antes de loguear evita rollback frágil: si el DELETE de rollback
    // fallara tras un email fallido, la mascota quedaría marcada sin haber
    // recibido el saludo de cumpleaños ese año. Trade-off: si el proceso muere
    // entre send y log, podría enviarse dos veces dentro de la misma corrida
    // (muy baja probabilidad en un cron diario con ventana de segundos).
    const { data: existingLog } = await supabase
      .from("sent_birthday_log")
      .select("pet_id")
      .eq("pet_id", pet.id)
      .eq("sent_on", todayIso)
      .maybeSingle();

    if (existingLog) {
      skipped++;
      continue;
    }

    const ageYears = today.getFullYear() - bd.getFullYear();
    const tutorName = [client.first_name, client.last_name]
      .filter(Boolean)
      .join(" ") || "Tutor";

    try {
      await sendPetBirthdayEmail({
        to: client.email,
        clinicName: org.name,
        tutorName,
        petName: pet.name,
        ageYears: ageYears > 0 ? ageYears : null,
        portalUrl: `${siteUrl}/tutor/${org.slug}/pets/${pet.id}`,
      });
    } catch (err) {
      console.error(
        `[cron/pet-birthdays] email failed for pet=${pet.id}`,
        err
      );
      skipped++;
      continue;
    }

    // Email enviado OK → loguear. Si el insert falla por PK dup (otro proceso
    // lo envió simultáneamente), se ignora. Si falla por otra razón, solo
    // perdemos la idempotencia para el próximo tick — bajo costo.
    const { error: logError } = await supabase
      .from("sent_birthday_log")
      .insert({
        pet_id: pet.id,
        org_id: pet.org_id,
        sent_on: todayIso,
      });

    if (logError && logError.code !== "23505") {
      console.warn(
        `[cron/pet-birthdays] log insert warning for pet=${pet.id}: ${logError.message}`
      );
    }
    sent++;
  }

  return NextResponse.json({
    ok: true,
    scanned: pets?.length ?? 0,
    sent,
    skipped,
  });
}
