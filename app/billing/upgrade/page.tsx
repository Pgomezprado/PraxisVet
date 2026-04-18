import Link from "next/link";
import { redirect } from "next/navigation";
import { differenceInCalendarDays } from "date-fns";
import {
  ArrowRight,
  Check,
  MessageCircle,
  PawPrint,
  Star,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { pricingTiers } from "@/lib/billing/tiers";
import { LogoutButton } from "@/components/billing/logout-button";
import type { Organization, SubscriptionStatus } from "@/types";

export const metadata = {
  title: "Activar plan · PraxisVet",
  robots: { index: false, follow: false },
};

const SUPPORT_EMAIL = "ventas@praxisvet.cl";

function statusLabel(status: SubscriptionStatus, daysLeft: number | null) {
  switch (status) {
    case "trial":
      if (daysLeft === null) return "Prueba activa";
      if (daysLeft <= 0) return "Prueba vencida";
      return `${daysLeft} días de prueba restantes`;
    case "expired":
      return "Plan vencido";
    case "past_due":
      return "Pago pendiente";
    case "cancelled":
      return "Cancelado";
    case "active":
      return "Plan activo";
  }
}

export default async function UpgradePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: memberships } = await supabase
    .from("organization_members")
    .select(
      `
      id,
      organizations!inner (
        id, name, slug, plan, subscription_status, trial_ends_at
      )
    `
    )
    .eq("user_id", user.id)
    .eq("active", true);

  const orgs: Pick<
    Organization,
    "id" | "name" | "slug" | "plan" | "subscription_status" | "trial_ends_at"
  >[] =
    (memberships ?? [])
      .map((m) => m.organizations as unknown)
      .filter(Boolean) as Pick<
      Organization,
      "id" | "name" | "slug" | "plan" | "subscription_status" | "trial_ends_at"
    >[];

  const expired = orgs.some(
    (o) =>
      o.subscription_status === "expired" ||
      o.subscription_status === "past_due" ||
      o.subscription_status === "cancelled"
  );

  const primaryHeadline = expired
    ? "Tu prueba terminó. Activa tu plan para seguir."
    : "Activa tu plan de PraxisVet";

  const primarySub = expired
    ? "Tus datos siguen seguros. Escríbenos y coordinamos la activación por transferencia bancaria o tarjeta."
    : "Elige el plan que calza con tu clínica. Si tienes dudas, conversemos antes de pagar.";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-card/40 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <PawPrint className="size-6 text-primary" />
            <span className="text-lg font-bold tracking-tight">
              Praxis<span className="text-primary">Vet</span>
            </span>
          </Link>
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="secondary" className="mb-4">
            {expired ? "Activación requerida" : "Planes"}
          </Badge>
          <h1 className="text-pretty text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {primaryHeadline}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">{primarySub}</p>
        </div>

        {orgs.length > 0 && (
          <section className="mx-auto mt-10 max-w-3xl rounded-2xl border border-border/60 bg-card p-6">
            <h2 className="mb-4 text-sm font-semibold text-foreground">
              Tus clínicas
            </h2>
            <ul className="space-y-3">
              {orgs.map((o) => {
                const daysLeft =
                  o.subscription_status === "trial" && o.trial_ends_at
                    ? differenceInCalendarDays(
                        new Date(o.trial_ends_at),
                        new Date()
                      )
                    : null;
                const isExpired =
                  o.subscription_status === "expired" ||
                  o.subscription_status === "past_due" ||
                  o.subscription_status === "cancelled" ||
                  (daysLeft !== null && daysLeft <= 0);
                return (
                  <li
                    key={o.id}
                    className="flex items-center justify-between gap-4 rounded-xl border border-border/40 bg-background p-4"
                  >
                    <div>
                      <p className="font-medium text-foreground">{o.name}</p>
                      <p className="text-xs text-muted-foreground">
                        praxisvet.cl/{o.slug}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-xs font-medium",
                          isExpired
                            ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                            : "bg-primary/15 text-primary"
                        )}
                      >
                        {statusLabel(o.subscription_status, daysLeft)}
                      </span>
                      {!isExpired && (
                        <Link
                          href={`/${o.slug}/dashboard`}
                          className="text-xs font-medium text-muted-foreground hover:text-foreground"
                        >
                          Ir al dashboard
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section className="mt-14 grid gap-6 lg:grid-cols-3">
          {pricingTiers.map((tier) => {
            const mailSubject = encodeURIComponent(
              `Activar plan ${tier.name} en PraxisVet`
            );
            const mailBody = encodeURIComponent(
              `Hola, quiero activar el plan ${tier.name} para mi clínica (${
                orgs[0]?.name ?? ""
              }).\n\nGracias.`
            );
            const mailHref = `mailto:${SUPPORT_EMAIL}?subject=${mailSubject}&body=${mailBody}`;

            return (
              <div
                key={tier.id}
                className={cn(
                  "relative flex flex-col rounded-3xl border bg-card p-8 shadow-sm transition-all duration-300",
                  tier.highlight
                    ? "border-primary/60 shadow-lg shadow-primary/10 ring-1 ring-primary/20 lg:-translate-y-2 lg:scale-[1.02]"
                    : "border-border/60 hover:-translate-y-1 hover:shadow-lg"
                )}
              >
                {tier.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary px-3 py-1 text-xs text-primary-foreground shadow-sm">
                      <Star className="mr-1 size-3 fill-current" />
                      Más popular
                    </Badge>
                  </div>
                )}

                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {tier.name}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {tier.tagline}
                  </p>
                </div>

                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight text-foreground">
                    {tier.price}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {tier.priceHint}
                  </span>
                </div>

                <a
                  href={mailHref}
                  className={cn(
                    buttonVariants({
                      size: "lg",
                      variant: tier.highlight ? "default" : "outline",
                    }),
                    "mt-6 w-full"
                  )}
                >
                  Activar {tier.name}
                  <ArrowRight className="ml-1.5 size-4" />
                </a>

                <ul className="mt-8 space-y-3 text-sm">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <div className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/15">
                        <Check className="size-2.5 text-primary" />
                      </div>
                      <span className="text-foreground/90">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>

        <section className="mx-auto mt-12 max-w-2xl rounded-2xl border border-border/60 bg-card p-6 text-center">
          <MessageCircle className="mx-auto size-6 text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">
            ¿Prefieres conversarlo? Escríbenos a{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
            >
              {SUPPORT_EMAIL}
            </a>{" "}
            y coordinamos la activación por transferencia bancaria o tarjeta.
            Tus datos siguen seguros mientras tanto.
          </p>
        </section>
      </main>
    </div>
  );
}
