import { cache } from "react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient as createAnonClient } from "@supabase/supabase-js";
import {
  ShieldCheck,
  Syringe,
  Bug,
  Calendar,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  HelpCircle,
  PawPrint,
} from "lucide-react";
import { formatSpecies } from "@/lib/validations/clients";
import { Separator } from "@/components/ui/separator";
import { PrintCardButton } from "./_components/print-card-button";
import { TutorAnalyticsBeacon } from "../../tutor/[clinic]/_components/tutor-analytics-beacon";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const BOT_UA_REGEX =
  /bot|crawl|spider|slurp|whatsapp|facebookexternalhit|preview|linkedinbot|twitterbot|telegrambot|discordbot|slackbot|googlebot|bingbot|yandex|duckduckbot|applebot|embedly|skypeuripreview|vkshare|petalbot|baiduspider|chatgpt|gptbot|anthropic|claudebot/i;

// =============================================================
// Tipos
// =============================================================
type RawCardResponse =
  | { found: false }
  | {
      found: true;
      status: "revoked";
      revoked_at: string;
    }
  | {
      found: true;
      status: "expired";
      expires_at: string;
    }
  | {
      found: true;
      status: "active";
      card: {
        id: string;
        created_at: string;
        expires_at: string;
        view_count: number;
        last_viewed_at: string | null;
      };
      pet: {
        id: string;
        name: string;
        species: string | null;
        breed: string | null;
        sex: string | null;
        birthdate: string | null;
        microchip: string | null;
        photo_url: string | null;
        color: string | null;
      };
      organization: {
        id: string;
        name: string;
        slug: string;
        logo_url: string | null;
        phone: string | null;
        address: string | null;
      };
      tutor: {
        first_name: string | null;
        last_name: string | null;
      };
      vaccinations: Array<{
        id: string;
        vaccine_name: string;
        date_administered: string;
        next_due_date: string | null;
        lot_number: string | null;
      }>;
      dewormings: Array<{
        id: string;
        type: string;
        date_administered: string;
        next_due_date: string | null;
        product: string | null;
      }>;
    };

export type HealthItemStatus =
  | "vigente"
  | "por_vencer"
  | "vencida"
  | "sin_vencimiento";

// =============================================================
// Helpers de DB (usan cliente anon — la RPC es SECURITY DEFINER)
// =============================================================
function publicSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "[c/token] Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }
  return createAnonClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

function isValidTokenShape(token: string): boolean {
  // base64url 24 bytes ≈ 32 chars; permitimos 24+ por seguridad ante cambios.
  return /^[A-Za-z0-9_-]{24,128}$/.test(token);
}

const fetchCard = cache(async function fetchCard(
  token: string
): Promise<RawCardResponse | null> {
  const supabase = publicSupabase();
  const { data, error } = await supabase.rpc("get_health_card_by_token", {
    p_token: token,
  });
  if (error) {
    console.error("[c/token] RPC error:", error);
    return null;
  }
  return data as RawCardResponse;
});

async function recordView(token: string): Promise<void> {
  const supabase = publicSupabase();
  const { error } = await supabase.rpc("record_health_card_view", {
    p_token: token,
  });
  if (error) {
    console.error("[c/token] record_view error:", error);
  }
}

// =============================================================
// Helpers de presentación
// =============================================================
function daysBetween(a: Date, b: Date): number {
  const ms = a.getTime() - b.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function classifyHealthItem(
  nextDueDate: string | null,
  warningDays = 30
): HealthItemStatus {
  if (!nextDueDate) return "sin_vencimiento";
  const now = new Date();
  const due = new Date(nextDueDate + "T12:00:00");
  const diffDays = daysBetween(due, now);
  if (diffDays < 0) return "vencida";
  if (diffDays <= warningDays) return "por_vencer";
  return "vigente";
}

function formatDate(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function calcAge(birthdate: string): string {
  const birth = new Date(birthdate + "T12:00:00");
  const now = new Date();
  const months =
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth());
  if (months < 12) return `${months} ${months === 1 ? "mes" : "meses"}`;
  const y = Math.floor(months / 12);
  return y === 1 ? "1 año" : `${y} años`;
}

function petInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function sexLabel(sex: string | null): string | null {
  if (sex === "male") return "Macho";
  if (sex === "female") return "Hembra";
  return null;
}

// =============================================================
// Metadata: noindex + Open Graph
// =============================================================
export async function generateMetadata(): Promise<Metadata> {
  const robots = { index: false, follow: false } as const;
  const title = "Cartola sanitaria PraxisVet";
  const description =
    "Pasaporte sanitario digital firmado por la clínica veterinaria. Abre el enlace para revisar los detalles.";

  return {
    title,
    description,
    robots,
    openGraph: {
      title,
      description,
      type: "website",
      locale: "es_CL",
      siteName: "PraxisVet",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

// =============================================================
// Página
// =============================================================
export default async function PublicHealthCardPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { token } = await params;
  const { preview } = await searchParams;

  if (!isValidTokenShape(token)) {
    notFound();
  }

  const data = await fetchCard(token);

  if (!data || data.found === false) {
    return <NotFoundCard />;
  }

  if (data.status === "revoked") {
    return <RevokedCard />;
  }

  if (data.status === "expired") {
    return <ExpiredCard expiresAt={data.expires_at} />;
  }

  // Activa: registrar vista solo si NO es preview interno y NO es bot/crawler.
  // Esto evita inflar view_count con previews de WhatsApp/Twitter o aperturas
  // del propio tutor desde su portal.
  if (preview !== "1") {
    const ua = (await headers()).get("user-agent") || "";
    if (!BOT_UA_REGEX.test(ua)) {
      await recordView(token);
    }
  }

  const { pet, organization, tutor, vaccinations, dewormings, card } = data;

  const vaccItems = vaccinations.map((v) => ({
    ...v,
    status: classifyHealthItem(v.next_due_date),
  }));
  const dewormItems = dewormings.map((d) => ({
    ...d,
    status: classifyHealthItem(d.next_due_date),
  }));

  // Vacunas vigentes/por vencer arriba; vencidas en sección separada al final.
  const vaccActive = vaccItems.filter((v) => v.status !== "vencida");
  const vaccExpired = vaccItems.filter((v) => v.status === "vencida");

  const dewormActive = dewormItems.filter((d) => d.status !== "vencida");
  const dewormExpired = dewormItems.filter((d) => d.status === "vencida");

  const tutorName =
    [tutor.first_name, tutor.last_name].filter(Boolean).join(" ").trim() ||
    "Tutor";

  const age = pet.birthdate ? calcAge(pet.birthdate) : null;

  return (
    <main className="health-card mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      <TutorAnalyticsBeacon
        event="tutor_healthcard_public_viewed"
        clinicSlug={organization.slug}
        petId={pet.id}
      />
      {/* Header: carnet del paciente, emitido por la clínica */}
      <header className="health-card__header mb-6 flex flex-col items-center gap-3 text-center">
        {organization.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={organization.logo_url}
            alt={organization.name}
            className="h-12 w-auto max-w-55 object-contain"
          />
        ) : (
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-xl font-bold text-primary">
            {organization.name[0]?.toUpperCase()}
          </div>
        )}
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Carnet sanitario digital
          </p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight sm:text-3xl">
            Carnet de {pet.name}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Emitido por {organization.name}
            {organization.address ? <> · {organization.address}</> : null}
          </p>
        </div>
      </header>

      {/* Mascota */}
      <section className="health-card__pet mb-6 overflow-hidden rounded-2xl border bg-card">
        <div className="flex flex-col items-center gap-4 p-6 text-center">
          {pet.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pet.photo_url}
              alt={pet.name}
              className="aspect-square size-40 rounded-2xl object-cover ring-1 ring-border"
            />
          ) : (
            <div className="flex aspect-square size-40 items-center justify-center rounded-2xl bg-primary/15 text-5xl font-bold text-primary ring-1 ring-primary/20">
              {petInitial(pet.name)}
            </div>
          )}

          <div>
            <h2 className="text-3xl font-bold tracking-tight">{pet.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {[
                formatSpecies(pet.species),
                pet.breed,
                sexLabel(pet.sex),
                age,
              ]
                .filter(Boolean)
                .join(" · ") || "Sin datos"}
            </p>
            {pet.microchip ? (
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                Microchip {pet.microchip}
              </p>
            ) : null}
            <p className="mt-3 text-xs text-muted-foreground">
              <span className="text-foreground/80">Tutor:</span> {tutorName}
            </p>
          </div>
        </div>
      </section>

      {/* Vacunas */}
      <Section
        icon={<Syringe className="size-4" />}
        title="Vacunas"
        count={vaccItems.length}
      >
        {vaccActive.length === 0 ? (
          <EmptyState>
            Aún no se han registrado vacunas para {pet.name} en{" "}
            {organization.name}.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-border/60">
            {vaccActive.map((v) => (
              <ItemRow
                key={v.id}
                title={v.vaccine_name}
                applied={v.date_administered}
                due={v.next_due_date}
                status={v.status}
              />
            ))}
          </ul>
        )}

        {vaccExpired.length > 0 ? (
          <>
            <div className="mt-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Separator className="flex-1" />
              <span>Vencidas</span>
              <Separator className="flex-1" />
            </div>
            <ul className="divide-y divide-border/60">
              {vaccExpired.map((v) => (
                <ItemRow
                  key={v.id}
                  title={v.vaccine_name}
                  applied={v.date_administered}
                  due={v.next_due_date}
                  status="vencida"
                />
              ))}
            </ul>
          </>
        ) : null}
      </Section>

      {/* Desparasitaciones */}
      <Section
        icon={<Bug className="size-4" />}
        title="Desparasitaciones"
        count={dewormItems.length}
      >
        {dewormItems.length === 0 ? (
          <EmptyState>
            Aún no se han registrado desparasitaciones para {pet.name} en{" "}
            {organization.name}.
          </EmptyState>
        ) : (
          <>
            <ul className="divide-y divide-border/60">
              {dewormActive.map((d) => (
                <ItemRow
                  key={d.id}
                  title={
                    d.type === "interna"
                      ? "Desparasitación interna"
                      : "Desparasitación externa"
                  }
                  subtitle={d.product || undefined}
                  applied={d.date_administered}
                  due={d.next_due_date}
                  status={d.status}
                />
              ))}
            </ul>

            {dewormExpired.length > 0 ? (
              <>
                <div className="mt-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <Separator className="flex-1" />
                  <span>Vencidas</span>
                  <Separator className="flex-1" />
                </div>
                <ul className="divide-y divide-border/60">
                  {dewormExpired.map((d) => (
                    <ItemRow
                      key={d.id}
                      title={
                        d.type === "interna"
                          ? "Desparasitación interna"
                          : "Desparasitación externa"
                      }
                      subtitle={d.product || undefined}
                      applied={d.date_administered}
                      due={d.next_due_date}
                      status="vencida"
                    />
                  ))}
                </ul>
              </>
            ) : null}
          </>
        )}
      </Section>

      {/* Validez + acciones */}
      <section className="mb-6 rounded-2xl border bg-card p-5">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-start gap-2">
            <Calendar className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Emitida
              </p>
              <p className="font-medium">{formatDateTime(card.created_at)}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-500" />
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Válida hasta
              </p>
              <p className="font-medium">{formatDateTime(card.expires_at)}</p>
            </div>
          </div>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Esta cartola refleja los registros sanitarios de{" "}
          <span className="font-medium text-foreground">{pet.name}</span> en{" "}
          <span className="font-medium text-foreground">
            {organization.name}
          </span>{" "}
          al {formatDateTime(card.created_at)}. No reemplaza la evaluación
          veterinaria presencial.
        </p>

        <div className="health-card__actions mt-5">
          <PrintCardButton />
        </div>
      </section>

      {/* Footer */}
      <footer className="health-card__footer flex flex-col items-center gap-1 pt-2 text-center text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <PawPrint className="size-3" />
          <span>Verificada con PraxisVet</span>
        </div>
        <p className="font-mono text-[10px] opacity-60">{token.slice(0, 8)}…</p>
      </footer>
    </main>
  );
}

// =============================================================
// Subcomponentes
// =============================================================
function Section({
  icon,
  title,
  count,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="health-card__section mb-6 rounded-2xl border bg-card p-5">
      <h3 className="mb-4 flex items-center gap-2 text-base font-semibold">
        <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
          {icon}
        </span>
        {title}
        {typeof count === "number" ? (
          <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {count}
          </span>
        ) : null}
      </h3>
      {children}
    </section>
  );
}

function ItemRow({
  title,
  subtitle,
  applied,
  due,
  status,
}: {
  title: string;
  subtitle?: string;
  applied: string;
  due: string | null;
  status: HealthItemStatus;
}) {
  const daysToDue =
    due !== null
      ? daysBetween(new Date(due + "T12:00:00"), new Date())
      : null;

  return (
    <li className="flex items-start justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">
          {title}
          {subtitle ? (
            <span className="font-normal text-muted-foreground">
              {" "}· {subtitle}
            </span>
          ) : null}
        </p>
        <p className="text-xs text-muted-foreground">
          Aplicada: {formatDate(applied)}
          {due ? <> · Vence: {formatDate(due)}</> : null}
        </p>
      </div>
      <StatusChip status={status} daysToDue={daysToDue} />
    </li>
  );
}

function StatusChip({
  status,
  daysToDue,
}: {
  status: HealthItemStatus;
  daysToDue: number | null;
}) {
  if (status === "sin_vencimiento") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
        <HelpCircle className="size-3" />
        Sin vencimiento
      </span>
    );
  }
  if (status === "vigente") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-500">
        <CheckCircle2 className="size-3" />
        Vigente
      </span>
    );
  }
  if (status === "por_vencer") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-500">
        <AlertTriangle className="size-3" />
        {daysToDue !== null && daysToDue >= 0
          ? `Por vencer en ${daysToDue} ${daysToDue === 1 ? "día" : "días"}`
          : "Por vencer"}
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-semibold text-red-500">
      <XCircle className="size-3" />
      {daysToDue !== null
        ? `Vencida hace ${Math.abs(daysToDue)} ${
            Math.abs(daysToDue) === 1 ? "día" : "días"
          }`
        : "Vencida"}
    </span>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-border/70 bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}

// =============================================================
// Estados especiales
// =============================================================
function StateShell({
  variant,
  title,
  description,
}: {
  variant: "neutral" | "warning" | "destructive";
  title: string;
  description: string;
}) {
  const iconMap = {
    neutral: <ShieldCheck className="size-7 text-muted-foreground" />,
    warning: <AlertTriangle className="size-7 text-amber-500" />,
    destructive: <XCircle className="size-7 text-red-500" />,
  };
  const ringMap = {
    neutral: "ring-border",
    warning: "ring-amber-500/30 bg-amber-500/5",
    destructive: "ring-red-500/30 bg-red-500/5",
  };
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col items-center justify-center px-6 py-16 text-center">
      <div
        className={`flex size-16 items-center justify-center rounded-2xl ring-1 ${ringMap[variant]}`}
      >
        {iconMap[variant]}
      </div>
      <h1 className="mt-5 text-xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {description}
      </p>
      <div className="mt-8 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <PawPrint className="size-3" />
        <span>Verificada con PraxisVet</span>
      </div>
    </main>
  );
}

function NotFoundCard() {
  return (
    <StateShell
      variant="neutral"
      title="No encontramos esta cartola"
      description="Verifica el link o pide uno nuevo al tutor."
    />
  );
}

function RevokedCard() {
  return (
    <StateShell
      variant="destructive"
      title="Esta cartola fue revocada"
      description="El tutor revocó este enlace. Ya no es válido. Pídele uno nuevo desde su portal."
    />
  );
}

function ExpiredCard({ expiresAt }: { expiresAt: string }) {
  return (
    <StateShell
      variant="warning"
      title="Esta cartola venció"
      description={`Venció el ${formatDateTime(
        expiresAt
      )}. Pídele al tutor que genere una nueva.`}
    />
  );
}
