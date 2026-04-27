"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import {
  requestExamSchema,
  uploadExamResultSchema,
  updateInterpretationSchema,
  type RequestExamInput,
  type UploadExamResultInput,
  type UpdateInterpretationInput,
} from "@/lib/validations/exams";
import {
  canViewExams,
  canInterpretExam,
} from "@/lib/auth/current-member";
import { getWhatsAppProvider } from "@/lib/notifications";
import type { ClinicalRecordExam, MemberRole } from "@/types";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

const EXAM_FILES_BUCKET = "exam-files";

async function getAuthUser() {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return { supabase, user };
}

async function getCurrentMembership(
  supabase: Awaited<ReturnType<typeof createSupabaseClient>>,
  userId: string,
  orgId: string
): Promise<
  | { ok: true; member: { id: string; role: MemberRole } }
  | { ok: false; error: string }
> {
  const { data, error } = await supabase
    .from("organization_members")
    .select("id, role")
    .eq("user_id", userId)
    .eq("org_id", orgId)
    .eq("active", true)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "No perteneces a esta clínica" };
  return {
    ok: true,
    member: { id: data.id, role: data.role as MemberRole },
  };
}

export type ExamWithRelations = {
  id: string;
  pet_id: string;
  clinical_record_id: string | null;
  type: ClinicalRecordExam["type"];
  custom_type_label: string | null;
  indications: string | null;
  status: ClinicalRecordExam["status"];
  result_file_name: string | null;
  result_file_type: string | null;
  result_date: string | null;
  vet_interpretation: string | null;
  shared_with_tutor_at: string | null;
  requested_at: string;
  created_at: string;
  updated_at: string;
  requested_by_member: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
  uploaded_by_member: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
};

const EXAM_LIST_SELECT = `
  id, pet_id, clinical_record_id, type, custom_type_label, indications,
  status, result_file_name, result_file_type, result_date,
  vet_interpretation, shared_with_tutor_at,
  requested_at, created_at, updated_at,
  requested_by_member:organization_members!requested_by (id, first_name, last_name),
  uploaded_by_member:organization_members!uploaded_by (id, first_name, last_name)
` as const;

// ============================================
// Lecturas
// ============================================

export async function getExams(
  petId: string
): Promise<ActionResult<ExamWithRelations[]>> {
  const { supabase } = await getAuthUser();

  const { data, error } = await supabase
    .from("clinical_record_exams")
    .select(EXAM_LIST_SELECT)
    .eq("pet_id", petId)
    .order("requested_at", { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as unknown as ExamWithRelations[] };
}

export async function getExamsByRecord(
  clinicalRecordId: string
): Promise<ActionResult<ClinicalRecordExam[]>> {
  const { supabase } = await getAuthUser();

  const { data, error } = await supabase
    .from("clinical_record_exams")
    .select("*")
    .eq("clinical_record_id", clinicalRecordId)
    .order("requested_at", { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as ClinicalRecordExam[] };
}

export async function getExam(
  examId: string
): Promise<ActionResult<ClinicalRecordExam>> {
  const { supabase } = await getAuthUser();

  const { data, error } = await supabase
    .from("clinical_record_exams")
    .select("*")
    .eq("id", examId)
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  if (!data) return { success: false, error: "Examen no encontrado" };
  return { success: true, data: data as ClinicalRecordExam };
}

// ============================================
// Mutaciones
// ============================================

export async function requestExam(
  orgId: string,
  clinicSlug: string,
  clientId: string,
  petId: string,
  input: RequestExamInput
): Promise<ActionResult<{ id: string }>> {
  const parsed = requestExamSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { supabase, user } = await getAuthUser();

  const membership = await getCurrentMembership(supabase, user.id, orgId);
  if (!membership.ok) return { success: false, error: membership.error };

  if (!canViewExams(membership.member.role)) {
    return {
      success: false,
      error: "Tu rol no tiene permisos para solicitar exámenes",
    };
  }

  // Si vienen relaciones, validamos pertenencia a la org.
  if (parsed.data.clinical_record_id) {
    const { data: rec } = await supabase
      .from("clinical_records")
      .select("id, org_id, pet_id")
      .eq("id", parsed.data.clinical_record_id)
      .maybeSingle();

    if (!rec || rec.org_id !== orgId || rec.pet_id !== petId) {
      return {
        success: false,
        error: "La ficha clínica indicada no pertenece a esta mascota",
      };
    }
  }

  const { data, error } = await supabase
    .from("clinical_record_exams")
    .insert({
      org_id: orgId,
      pet_id: petId,
      clinical_record_id: parsed.data.clinical_record_id ?? null,
      requested_by: membership.member.id,
      type: parsed.data.type,
      custom_type_label:
        parsed.data.type === "otro"
          ? (parsed.data.custom_type_label ?? null)
          : null,
      indications: parsed.data.indications ?? null,
      status: "solicitado",
      requested_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };
  if (!data) {
    return {
      success: false,
      error:
        "No se pudo crear la solicitud. Es posible que tu rol no tenga permisos.",
    };
  }

  revalidatePath(
    `/${clinicSlug}/clients/${clientId}/pets/${petId}`,
    "layout"
  );
  return { success: true, data: { id: data.id } };
}

export async function uploadExamResult(
  orgId: string,
  clinicSlug: string,
  clientId: string,
  petId: string,
  examId: string,
  input: UploadExamResultInput
): Promise<ActionResult<{ id: string }>> {
  const parsed = uploadExamResultSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { supabase, user } = await getAuthUser();

  const membership = await getCurrentMembership(supabase, user.id, orgId);
  if (!membership.ok) return { success: false, error: membership.error };

  if (!canViewExams(membership.member.role)) {
    return {
      success: false,
      error: "Tu rol no tiene permisos para cargar resultados",
    };
  }

  // Validar que el examen exista en la org y mascota correctas.
  const { data: existing } = await supabase
    .from("clinical_record_exams")
    .select("id, org_id, pet_id, result_file_url")
    .eq("id", examId)
    .maybeSingle();

  if (!existing || existing.org_id !== orgId || existing.pet_id !== petId) {
    return { success: false, error: "Examen no encontrado" };
  }

  // Validar que el path del archivo subido viva dentro del folder de la org.
  // Convención: ${org_id}/${pet_id}/${exam_id}/${uuid}.${ext}
  const expectedPrefix = `${orgId}/${petId}/${examId}/`;
  if (!parsed.data.file_url.startsWith(expectedPrefix)) {
    return {
      success: false,
      error: "Ruta del archivo inválida para este examen",
    };
  }

  // Si la interpretación viene en este mismo upload, validar permisos.
  const wantsInterpretation =
    parsed.data.vet_interpretation !== undefined &&
    parsed.data.vet_interpretation !== null &&
    parsed.data.vet_interpretation.trim().length > 0;

  if (wantsInterpretation && !canInterpretExam(membership.member.role)) {
    return {
      success: false,
      error:
        "Tu rol no puede registrar la interpretación clínica. Solo veterinarios o administradores.",
    };
  }

  // Si había un archivo previo, lo borramos del storage para no dejar huérfanos.
  if (existing.result_file_url && existing.result_file_url !== parsed.data.file_url) {
    await supabase.storage
      .from(EXAM_FILES_BUCKET)
      .remove([existing.result_file_url]);
  }

  const { data, error } = await supabase
    .from("clinical_record_exams")
    .update({
      status: "resultado_cargado",
      result_file_url: parsed.data.file_url,
      result_file_name: parsed.data.file_name,
      result_file_type: parsed.data.file_type,
      result_date: parsed.data.result_date,
      vet_interpretation: wantsInterpretation
        ? (parsed.data.vet_interpretation ?? null)
        : undefined,
      uploaded_by: membership.member.id,
    })
    .eq("id", examId)
    .select("id");

  if (error) return { success: false, error: error.message };
  if (!data || data.length === 0) {
    return {
      success: false,
      error:
        "No se pudo guardar el resultado. Es posible que tu rol no tenga permisos.",
    };
  }

  revalidatePath(
    `/${clinicSlug}/clients/${clientId}/pets/${petId}`,
    "layout"
  );
  return { success: true, data: { id: data[0].id } };
}

export async function updateInterpretation(
  orgId: string,
  clinicSlug: string,
  clientId: string,
  petId: string,
  examId: string,
  input: UpdateInterpretationInput
): Promise<ActionResult<{ id: string }>> {
  const parsed = updateInterpretationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { supabase, user } = await getAuthUser();

  const membership = await getCurrentMembership(supabase, user.id, orgId);
  if (!membership.ok) return { success: false, error: membership.error };

  // Doble candado: rol + RLS. updateInterpretation NO puede llamarla recepcionista.
  if (!canInterpretExam(membership.member.role)) {
    return {
      success: false,
      error:
        "Solo veterinarios y administradores pueden registrar la interpretación clínica",
    };
  }

  // Validar pertenencia
  const { data: existing } = await supabase
    .from("clinical_record_exams")
    .select("id, org_id, pet_id")
    .eq("id", examId)
    .maybeSingle();

  if (!existing || existing.org_id !== orgId || existing.pet_id !== petId) {
    return { success: false, error: "Examen no encontrado" };
  }

  const { data, error } = await supabase
    .from("clinical_record_exams")
    .update({
      vet_interpretation: parsed.data.vet_interpretation,
    })
    .eq("id", examId)
    .select("id");

  if (error) return { success: false, error: error.message };
  if (!data || data.length === 0) {
    return {
      success: false,
      error:
        "No se pudo actualizar la interpretación. Es posible que tu rol no tenga permisos.",
    };
  }

  revalidatePath(
    `/${clinicSlug}/clients/${clientId}/pets/${petId}`,
    "layout"
  );
  return { success: true, data: { id: data[0].id } };
}

export async function deleteExam(
  orgId: string,
  clinicSlug: string,
  clientId: string,
  petId: string,
  examId: string
): Promise<ActionResult> {
  const { supabase, user } = await getAuthUser();

  const membership = await getCurrentMembership(supabase, user.id, orgId);
  if (!membership.ok) return { success: false, error: membership.error };

  if (membership.member.role !== "admin") {
    return {
      success: false,
      error: "Solo administradores pueden eliminar exámenes",
    };
  }

  // Leemos el path del archivo antes de borrar la fila, para limpiarlo del bucket.
  const { data: existing } = await supabase
    .from("clinical_record_exams")
    .select("id, org_id, pet_id, result_file_url")
    .eq("id", examId)
    .maybeSingle();

  if (!existing || existing.org_id !== orgId || existing.pet_id !== petId) {
    return { success: false, error: "Examen no encontrado" };
  }

  if (existing.result_file_url) {
    // Best-effort: si Storage falla, no abortamos la eliminación de la fila.
    // El admin pidió eliminarlo y los archivos huérfanos pueden limpiarse aparte.
    await supabase.storage
      .from(EXAM_FILES_BUCKET)
      .remove([existing.result_file_url]);
  }

  const { data, error } = await supabase
    .from("clinical_record_exams")
    .delete()
    .eq("id", examId)
    .select("id");

  if (error) return { success: false, error: error.message };
  if (!data || data.length === 0) {
    return {
      success: false,
      error:
        "No se pudo eliminar el examen. Es posible que ya haya sido eliminado o que tu rol no tenga permisos.",
    };
  }

  revalidatePath(
    `/${clinicSlug}/clients/${clientId}/pets/${petId}`,
    "layout"
  );
  return { success: true, data: undefined };
}

export async function shareExamWithTutor(
  orgId: string,
  clinicSlug: string,
  clientId: string,
  petId: string,
  examId: string
): Promise<ActionResult> {
  const { supabase, user } = await getAuthUser();

  const membership = await getCurrentMembership(supabase, user.id, orgId);
  if (!membership.ok) return { success: false, error: membership.error };

  if (!canViewExams(membership.member.role)) {
    return {
      success: false,
      error: "Tu rol no puede compartir exámenes con el tutor",
    };
  }

  const { data: exam } = await supabase
    .from("clinical_record_exams")
    .select(
      `
      id, org_id, pet_id, status, vet_interpretation, result_file_name,
      pet:pets!pet_id (id, name, client_id, client:clients!client_id (id, first_name, phone_e164, whatsapp_opt_in)),
      org:organizations!org_id (id, name, whatsapp_reminders_enabled)
    `
    )
    .eq("id", examId)
    .maybeSingle();

  if (!exam || exam.org_id !== orgId || exam.pet_id !== petId) {
    return { success: false, error: "Examen no encontrado" };
  }

  if (exam.status !== "resultado_cargado") {
    return {
      success: false,
      error: "Solo puedes compartir exámenes con resultado cargado",
    };
  }

  // Regla de negocio: no compartir sin interpretación clínica.
  const interpretation = exam.vet_interpretation?.trim() ?? "";
  if (interpretation.length === 0) {
    return {
      success: false,
      error:
        "Debes registrar la interpretación clínica antes de compartir el resultado",
    };
  }

  // Marcar como compartido
  const { data: updated, error: updateError } = await supabase
    .from("clinical_record_exams")
    .update({ shared_with_tutor_at: new Date().toISOString() })
    .eq("id", examId)
    .select("id");

  if (updateError) {
    return { success: false, error: updateError.message };
  }
  if (!updated || updated.length === 0) {
    return {
      success: false,
      error:
        "No se pudo marcar el examen como compartido. Es posible que tu rol no tenga permisos.",
    };
  }

  // Intento de WhatsApp (best-effort; si no está configurado, no falla).
  // TODO(F2): cuando esté aprobado el template "exam_ready" en Meta + agregado a
  // lib/notifications/templates.ts, enviar aquí la notificación. Por ahora solo
  // dejamos registro y el portal del tutor ya muestra el examen sin push.
  try {
    const provider = getWhatsAppProvider();
    const petWithClient = (exam as unknown as {
      pet: {
        name: string;
        client: {
          first_name: string | null;
          phone_e164: string | null;
          whatsapp_opt_in: boolean;
        };
      };
      org: { name: string; whatsapp_reminders_enabled: boolean };
    }).pet;
    const orgRow = (exam as unknown as {
      org: { name: string; whatsapp_reminders_enabled: boolean };
    }).org;

    const orgEnabled = orgRow?.whatsapp_reminders_enabled ?? false;
    const tutorOptIn = petWithClient?.client?.whatsapp_opt_in ?? false;
    const tutorPhone = petWithClient?.client?.phone_e164 ?? null;

    if (provider && orgEnabled && tutorOptIn && tutorPhone) {
      // Template "exam_ready" aún no existe — ver TODO arriba.
      // No intentamos sendTemplate sin builder tipado para no enviar payload mal armado.
      console.info(
        "[exams.shareWithTutor] WhatsApp configurado pero falta template exam_ready; se omite envío. examId=" +
          examId
      );
    }
  } catch (e) {
    // Nunca dejar caer la acción por un fallo de notificación.
    console.warn("[exams.shareWithTutor] notificación falló", e);
  }

  revalidatePath(
    `/${clinicSlug}/clients/${clientId}/pets/${petId}`,
    "layout"
  );
  return { success: true, data: undefined };
}

export async function getSignedExamUrl(
  orgId: string,
  examId: string
): Promise<ActionResult<{ url: string }>> {
  const { supabase, user } = await getAuthUser();

  const membership = await getCurrentMembership(supabase, user.id, orgId);
  if (!membership.ok) return { success: false, error: membership.error };

  if (!canViewExams(membership.member.role)) {
    return {
      success: false,
      error: "Tu rol no puede ver el archivo del examen",
    };
  }

  const { data: exam } = await supabase
    .from("clinical_record_exams")
    .select("id, org_id, result_file_url")
    .eq("id", examId)
    .maybeSingle();

  if (!exam || exam.org_id !== orgId) {
    return { success: false, error: "Examen no encontrado" };
  }
  if (!exam.result_file_url) {
    return {
      success: false,
      error: "Este examen aún no tiene archivo cargado",
    };
  }

  // Defensa adicional: el path debe seguir la convención y vivir bajo la org del usuario.
  if (!exam.result_file_url.startsWith(`${orgId}/`)) {
    return {
      success: false,
      error: "Ruta del archivo inválida",
    };
  }

  const { data, error } = await supabase.storage
    .from(EXAM_FILES_BUCKET)
    .createSignedUrl(exam.result_file_url, 300); // 5 minutos

  if (error || !data?.signedUrl) {
    return {
      success: false,
      error: error?.message ?? "No se pudo generar el enlace temporal",
    };
  }

  return { success: true, data: { url: data.signedUrl } };
}

// ============================================
// Helpers (catálogo de tipos para UI)
// ============================================

export const EXAM_TYPE_LABELS: Record<ClinicalRecordExam["type"], string> = {
  hemograma: "Hemograma",
  perfil_bioquimico: "Perfil bioquímico",
  urianalisis: "Urianálisis",
  rayos_x: "Rayos X",
  ecografia: "Ecografía",
  citologia: "Citología",
  biopsia: "Biopsia",
  otro: "Otro",
};

export function formatExamType(
  type: ClinicalRecordExam["type"],
  customLabel?: string | null
): string {
  if (type === "otro" && customLabel?.trim()) return customLabel.trim();
  return EXAM_TYPE_LABELS[type] ?? type;
}
