import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/billing/logout-button";

export const dynamic = "force-dynamic";

export default async function TutorClinicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ clinic: string }>;
}) {
  const { clinic } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Verifica que el user sea tutor activo de esta clínica.
  const { data: link } = await supabase
    .from("client_auth_links")
    .select(
      `
      id, client_id, active, linked_at,
      organizations!inner ( id, name, slug, logo_url ),
      clients ( id, first_name, last_name )
    `
    )
    .eq("user_id", user.id)
    .eq("active", true)
    .not("linked_at", "is", null)
    .eq("organizations.slug", clinic)
    .maybeSingle();

  if (!link) {
    redirect("/tutor");
  }

  const org = (link.organizations as unknown) as {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
  };
  const client = (link.clients as unknown) as {
    id: string;
    first_name: string;
    last_name: string;
  } | null;

  const initials = client
    ? `${client.first_name?.[0] ?? ""}${client.last_name?.[0] ?? ""}`.toUpperCase()
    : "T";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
          <Link
            href={`/tutor/${clinic}`}
            className="flex items-center gap-3 min-w-0"
          >
            {org.logo_url ? (
              <img
                src={org.logo_url}
                alt={org.name}
                className="size-9 shrink-0 rounded-md object-cover"
              />
            ) : (
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-sm font-semibold text-primary">
                {org.name[0]?.toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight">
                {org.name}
              </p>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Portal del tutor
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs text-muted-foreground">Conectado como</p>
              <p className="text-sm font-medium">
                {client
                  ? `${client.first_name} ${client.last_name}`
                  : "Tutor"}
              </p>
            </div>
            <div className="flex size-9 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
              {initials}
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
    </div>
  );
}
