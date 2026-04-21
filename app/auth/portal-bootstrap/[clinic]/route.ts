import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin.server";

/**
 * Callback del magic link del portal del tutor.
 *
 * Después de que Supabase autentica al user vía /auth/callback, redirige
 * aquí. Aquí buscamos el `client_auth_links` que estaba esperando por ese
 * email en esta clínica y completamos el vínculo (user_id + linked_at).
 * Luego redirigimos al portal del tutor.
 *
 * Nota sobre el service-role: el usuario recién autenticado todavía no
 * aparece en organization_members ni tiene un vínculo linked_at, por lo
 * que las policies `client_auth_links_self_read` (que exigen linked_at)
 * y `_staff_read` (que exigen membership) no le dan acceso. Necesitamos
 * service-role para el UPSERT — está allowlisted para `/auth/portal-bootstrap/**`.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ clinic: string }> }
) {
  const { clinic } = await context.params;
  const { origin } = new URL(request.url);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return NextResponse.redirect(
      new URL("/auth/login?error=portal_bootstrap_no_user", origin)
    );
  }

  const admin = createAdminClient();

  // 1) Resolver la org por slug.
  const { data: org } = await admin
    .from("organizations")
    .select("id, slug")
    .eq("slug", clinic)
    .maybeSingle();

  if (!org) {
    return NextResponse.redirect(
      new URL("/auth/login?error=portal_clinic_not_found", origin)
    );
  }

  // 2) Buscar un vínculo pendiente para ese email en esa org.
  const emailLc = user.email.trim().toLowerCase();
  const { data: pendingLink } = await admin
    .from("client_auth_links")
    .select("id, user_id, linked_at")
    .eq("org_id", org.id)
    .eq("active", true)
    .ilike("email", emailLc)
    .maybeSingle();

  if (!pendingLink) {
    return NextResponse.redirect(
      new URL("/auth/login?error=portal_no_invitation", origin)
    );
  }

  // 3) Si ya estaba linked a otro user_id, no pisar; solo verificar que sea este.
  if (pendingLink.linked_at && pendingLink.user_id !== user.id) {
    return NextResponse.redirect(
      new URL("/auth/login?error=portal_already_linked", origin)
    );
  }

  if (!pendingLink.linked_at) {
    const { error: updateErr } = await admin
      .from("client_auth_links")
      .update({
        user_id: user.id,
        linked_at: new Date().toISOString(),
      })
      .eq("id", pendingLink.id);

    if (updateErr) {
      return NextResponse.redirect(
        new URL("/auth/login?error=portal_link_failed", origin)
      );
    }
  }

  return NextResponse.redirect(new URL(`/tutor/${clinic}`, origin));
}
