// Traduce errores de Supabase (Postgres) a mensajes amigables para el usuario
// final. Evita filtrar detalles técnicos ni stacks al cliente.
//
// Uso:
//   const { data, error } = await supabase.from("x").insert(...)
//   if (error) return { success: false, error: formatSupabaseError(error) }

type SupabaseLikeError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

export function formatSupabaseError(error: SupabaseLikeError | unknown): string {
  // Siempre loguear el error completo para el desarrollador.
  // eslint-disable-next-line no-console
  console.error("[supabase]", error);

  const code =
    error && typeof error === "object" && "code" in error
      ? (error as SupabaseLikeError).code ?? ""
      : "";

  switch (code) {
    case "23505":
      return "Ya existe un registro con estos datos";
    case "23503":
      return "Referencia inválida a otro registro";
    case "22P02":
      return "Formato de datos inválido";
    default:
      return "No se pudo guardar el registro. Intenta nuevamente.";
  }
}
