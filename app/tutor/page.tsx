import Link from "next/link";
import { redirect } from "next/navigation";
import { PawPrint, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function TutorSelectorPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: links } = await supabase
    .from("client_auth_links")
    .select(
      `
      id, client_id,
      organizations!inner ( id, name, slug, logo_url )
    `
    )
    .eq("user_id", user.id)
    .eq("active", true)
    .not("linked_at", "is", null);

  const clinics = ((links ?? []) as unknown as Array<{
    id: string;
    organizations: {
      id: string;
      name: string;
      slug: string;
      logo_url: string | null;
    };
  }>).map((l) => l.organizations);

  if (clinics.length === 0) {
    redirect("/auth/login?error=portal_no_access");
  }

  if (clinics.length === 1) {
    redirect(`/tutor/${clinics[0].slug}`);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4 py-10">
      <div className="mb-6 space-y-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Elige una clínica
        </h1>
        <p className="text-sm text-muted-foreground">
          Tienes acceso al portal en más de una clínica veterinaria.
        </p>
      </div>

      <div className="space-y-3">
        {clinics.map((c) => (
          <Link key={c.id} href={`/tutor/${c.slug}`} className="block">
            <Card className="transition-colors hover:border-primary/50 hover:bg-muted/30">
              <CardHeader>
                <div className="flex items-center gap-3">
                  {c.logo_url ? (
                    <img
                      src={c.logo_url}
                      alt={c.name}
                      className="size-12 shrink-0 rounded-md object-cover"
                    />
                  ) : (
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-md bg-primary/10">
                      <PawPrint className="size-5 text-primary" />
                    </div>
                  )}
                  <div className="flex-1">
                    <CardTitle className="text-base">{c.name}</CardTitle>
                    <CardDescription className="text-xs">
                      Entrar al portal del tutor
                    </CardDescription>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="hidden" />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
