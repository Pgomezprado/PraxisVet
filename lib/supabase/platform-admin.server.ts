/**
 * ⚠️  PLATFORM ADMIN SUPABASE CLIENT — SERVICE ROLE
 * ⚠️  NUNCA importar desde fuera de `lib/superadmin/` o `app/(superadmin)/`.
 * ⚠️  Uso exclusivo del panel superadmin.
 *
 * Este cliente bypasea TODAS las políticas RLS. Un import accidental desde
 * otra parte de la app sería una escalación total de privilegios. La regla
 * ESLint `no-restricted-imports` en `eslint.config.mjs` bloquea el import
 * fuera de las rutas permitidas.
 *
 * Nunca exportamos una instancia singleton a nivel de módulo: se crea una
 * nueva por llamada para evitar reutilización entre requests (Next.js server
 * runtime puede compartir módulos entre invocaciones) y para facilitar el
 * tear-down en tests.
 */

import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function createPlatformAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error(
      "[platform-admin] NEXT_PUBLIC_SUPABASE_URL no está definida en el entorno."
    );
  }
  if (!serviceRoleKey) {
    throw new Error(
      "[platform-admin] SUPABASE_SERVICE_ROLE_KEY no está definida en el entorno. " +
        "Esta clave nunca debe existir en builds del cliente."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        "x-praxisvet-client": "platform-admin-server",
      },
    },
  });
}
