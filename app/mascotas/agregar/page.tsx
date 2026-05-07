import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AddFirstPetForm } from "../_components/add-first-pet-form";

export const dynamic = "force-dynamic";

export default async function AgregarMascotaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?redirect=/mascotas/agregar");

  const { data: link } = await supabase
    .from("client_auth_links")
    .select("clients ( first_name )")
    .eq("user_id", user.id)
    .eq("active", true)
    .not("linked_at", "is", null)
    .maybeSingle();

  type LinkRow = { clients: { first_name: string | null } | null };
  const tutorFirstName =
    (link as unknown as LinkRow | null)?.clients?.first_name?.split(" ")[0] ??
    null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link
        href="/mascotas/salud"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Mis mascotas
      </Link>

      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          Agregar otra mascota
        </h1>
        <p className="text-sm text-muted-foreground md:text-base">
          Cuéntanos lo básico. Después podrás registrar vacunas y más datos
          desde la ficha de tu mascota.
        </p>
      </header>

      <AddFirstPetForm tutorFirstName={tutorFirstName} />
    </div>
  );
}
