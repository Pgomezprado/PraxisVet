import type { Metadata } from "next";
import "../tutor/tutor-theme.css";
import { createClient } from "@/lib/supabase/server";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { LogoutButton } from "@/components/billing/logout-button";
import { MascotasSidebar } from "./_components/mascotas-sidebar";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "PraxisVet · Para tu mascota",
};

export default async function MascotasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let firstName: string | null = null;
  let initials = "T";
  if (user) {
    const { data: link } = await supabase
      .from("client_auth_links")
      .select("clients ( first_name, last_name )")
      .eq("user_id", user.id)
      .eq("active", true)
      .not("linked_at", "is", null)
      .maybeSingle();

    type LinkRow = {
      clients: { first_name: string | null; last_name: string | null } | null;
    };
    const client = (link as unknown as LinkRow | null)?.clients ?? null;
    if (client?.first_name) {
      firstName = client.first_name.split(" ")[0] ?? null;
      const last = client.last_name?.[0] ?? "";
      initials = `${client.first_name[0] ?? ""}${last}`.toUpperCase();
    }
  }

  return (
    <div
      data-theme="tutor-warm"
      className="min-h-screen bg-background text-foreground"
    >
      <SidebarProvider>
        <MascotasSidebar />
        <SidebarInset>
          <header className="flex h-14 items-center justify-between gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur-sm md:px-6">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="md:hidden" />
              <p className="text-sm font-medium text-muted-foreground">
                {firstName ? `Hola, ${firstName}` : "Bienvenido a PraxisVet"}
              </p>
            </div>
            {user && (
              <div className="flex items-center gap-3">
                <span className="hidden h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary md:flex">
                  {initials}
                </span>
                <LogoutButton />
              </div>
            )}
          </header>
          <main className="flex-1 p-4 md:p-8">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
