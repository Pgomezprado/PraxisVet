/**
 * ⚠️  AUTH/INVITATIONS SUPABASE CLIENT — SERVICE ROLE
 * ⚠️  Uso exclusivo del flujo de invitaciones y auth server-side.
 * ⚠️  Allowlisted en eslint.config.mjs — NO importar desde otras rutas.
 *
 * Este cliente bypasea RLS. Se usa para:
 *   - Crear usuarios en auth.users durante aceptación de invitación.
 *   - Leer/actualizar invitations por token (el invitado aún no está auth'd).
 *   - Vincular el nuevo user_id al organization_member existente.
 *
 * Para el panel superadmin usa `platform-admin.server.ts` (otro cliente).
 */

import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];

  if (!url) {
    throw new Error("[admin] NEXT_PUBLIC_SUPABASE_URL no está definida.");
  }
  if (!serviceRoleKey) {
    throw new Error("[admin] SUPABASE_SERVICE_ROLE_KEY no está definida.");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { "x-praxisvet-client": "auth-admin-server" },
    },
  });
}
