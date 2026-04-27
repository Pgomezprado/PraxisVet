import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const EXAM_FILES_BUCKET = "exam-files";
const SIGNED_URL_TTL_SECONDS = 60;

/**
 * Descarga (vía redirect a signed URL temporal) de un examen compartido con
 * el tutor. Validaciones:
 * 1. Sesión Supabase activa.
 * 2. El user tiene un client_auth_link activo en la clínica indicada.
 * 3. El examen pertenece a una mascota del tutor (vía RLS de clinical_record_exams).
 * 4. El examen tiene `shared_with_tutor_at NOT NULL` y status `resultado_cargado`.
 *
 * No devolvemos el archivo en stream — redirigimos al signed URL del bucket
 * privado. TTL corto (60s) para minimizar redistribución del enlace.
 */
export async function GET(
  _request: Request,
  context: {
    params: Promise<{ clinic: string; examId: string }>;
  }
) {
  const { clinic, examId } = await context.params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // 1. Verificar que el user es tutor activo de esta clínica.
  const { data: link } = await supabase
    .from("client_auth_links")
    .select("id, org_id, organizations!inner(slug)")
    .eq("user_id", user.id)
    .eq("active", true)
    .not("linked_at", "is", null)
    .eq("organizations.slug", clinic)
    .maybeSingle();

  if (!link) {
    return NextResponse.json(
      { error: "No perteneces a esta clínica" },
      { status: 403 }
    );
  }

  // 2. Cargar el examen. RLS sobre clinical_record_exams debe permitir al
  //    tutor leer SOLO sus propios exámenes compartidos.
  const { data: exam } = await supabase
    .from("clinical_record_exams")
    .select(
      "id, org_id, pet_id, status, result_file_url, shared_with_tutor_at"
    )
    .eq("id", examId)
    .maybeSingle();

  if (!exam) {
    return NextResponse.json(
      { error: "Examen no disponible" },
      { status: 404 }
    );
  }

  if (exam.org_id !== link.org_id) {
    return NextResponse.json(
      { error: "Examen no disponible" },
      { status: 403 }
    );
  }

  if (exam.status !== "resultado_cargado" || !exam.shared_with_tutor_at) {
    return NextResponse.json(
      { error: "Este examen aún no está disponible" },
      { status: 403 }
    );
  }

  if (!exam.result_file_url) {
    return NextResponse.json(
      { error: "Sin archivo de resultado" },
      { status: 404 }
    );
  }

  const { data: signed, error: signError } = await supabase.storage
    .from(EXAM_FILES_BUCKET)
    .createSignedUrl(exam.result_file_url, SIGNED_URL_TTL_SECONDS);

  if (signError || !signed?.signedUrl) {
    return NextResponse.json(
      { error: "No se pudo generar el enlace temporal" },
      { status: 500 }
    );
  }

  return NextResponse.redirect(signed.signedUrl, { status: 302 });
}
