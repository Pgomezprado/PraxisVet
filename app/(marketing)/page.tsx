import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  CalendarDays,
  ClipboardList,
  Receipt,
  Package,
  Building2,
  ShieldCheck,
  UserPlus,
  Settings,
  Rocket,
  PawPrint,
  ArrowRight,
  Star,
  Activity,
  Users,
  TrendingUp,
  Syringe,
  Clock,
  Scissors,
  Stethoscope,
  UserCog,
  Headset,
  Check,
  Heart,
  Sparkles,
  MessageCircle,
  FileText,
} from "lucide-react";

// ==================================================================
// Data
// ==================================================================

const bigFeatures = [
  {
    icon: CalendarDays,
    title: "Agenda que respeta tu ritmo",
    description:
      "Calendario semanal y diario, recordatorios automáticos por WhatsApp y correo. Tu recepcionista agenda sin dolores de cabeza.",
  },
  {
    icon: ClipboardList,
    title: "Ficha clínica que no se pierde",
    description:
      "Anamnesis, signos vitales, diagnósticos, vacunas, recetas y adjuntos de Luna en una sola pantalla. Accesible entre consultas.",
  },
  {
    icon: Scissors,
    title: "Peluquería con su propio flujo",
    description:
      "Tu peluquero tiene su propio dashboard, citas y notas. Sin mezclar con lo médico, sin ver fichas clínicas confidenciales.",
  },
] as const;

const smallFeatures = [
  {
    icon: Receipt,
    title: "Boleta y factura SII",
    description:
      "Emite boleta electrónica (B2C) o factura (B2B con RUT) desde la consulta. Receta retenida lista para medicamentos controlados.",
  },
  {
    icon: Package,
    title: "Inventario con alertas",
    description:
      "Stock de vacunas, medicamentos y accesorios. Alertas cuando baja el stock mínimo. Se descuenta solo al vender.",
  },
  {
    icon: Building2,
    title: "Multi-clínica",
    description:
      "¿Tienes más de una sucursal? Gestión centralizada con datos aislados entre clínicas. Disponible en el plan Enterprise.",
  },
  {
    icon: ShieldCheck,
    title: "Seguridad de verdad",
    description:
      "Row Level Security en la base de datos. Cada clínica ve solo sus datos. Cumplimiento normativo chileno.",
  },
] as const;

const dayInClinic = [
  {
    icon: UserCog,
    who: "Admin",
    headline: "Revisas el negocio de un vistazo.",
    bullets: [
      "Ingresos, equipo e inventario en un dashboard.",
      "Cierras caja del día sin planillas.",
    ],
  },
  {
    icon: Stethoscope,
    who: "Veterinario",
    headline: "Abres la ficha de Luna, dictas, imprimes receta.",
    bullets: [
      "Consulta y vacunas en el flujo justo.",
      "Siguiente paciente, sin copiar datos.",
    ],
  },
  {
    icon: Headset,
    who: "Recepcionista",
    headline: "Agendas, cobras con boleta SII, recibes al dueño.",
    bullets: [
      "Búsqueda rápida por RUT o nombre de mascota.",
      "Cobro en 3 clics, entrega de boleta por correo.",
    ],
  },
  {
    icon: Scissors,
    who: "Peluquero",
    headline: "Tu lista de servicios, sin mezclarse con lo médico.",
    bullets: [
      "Estados claros: en curso, listo para retiro.",
      "Notas del baño y corte en la ficha.",
    ],
  },
] as const;

const pricingTiers = [
  {
    name: "Básico",
    tagline: "Para el veterinario que recién se independiza.",
    price: "$29.000",
    priceHint: "CLP / mes",
    cta: "Probar 2 meses gratis",
    ctaHref: "/auth/register",
    highlight: false,
    trial: "2 meses de prueba, sin tarjeta",
    features: [
      "1 veterinario",
      "Hasta 50 pacientes",
      "Agenda y ficha clínica",
      "Boleta SII básica",
      "Soporte por correo",
    ],
  },
  {
    name: "Pro",
    tagline: "Para la mayoría de las clínicas.",
    price: "$79.000",
    priceHint: "CLP / mes",
    cta: "Probar 2 meses gratis",
    ctaHref: "/auth/register",
    highlight: true,
    trial: "2 meses de prueba, sin tarjeta",
    features: [
      "Hasta 5 miembros del equipo",
      "Pacientes ilimitados",
      "Peluquería integrada",
      "Facturación SII",
      "Inventario + alertas",
      "Recordatorios automáticos",
      "Exporta a PDF",
      "Soporte por WhatsApp",
    ],
  },
  {
    name: "Enterprise",
    tagline: "Para clínicas con varias sucursales.",
    price: "$149.000",
    priceHint: "CLP / mes",
    cta: "Hablar con ventas",
    ctaHref: "mailto:ventas@praxisvet.cl",
    highlight: false,
    trial: null,
    features: [
      "Equipo ilimitado",
      "Multi-clínica",
      "API e integraciones",
      "Onboarding guiado",
      "SLA + soporte prioritario",
    ],
  },
] as const;

const faqs = [
  {
    q: "¿Cómo funcionan los 2 meses de prueba?",
    a: "Los planes Básico y Pro vienen con 2 meses de prueba sin tarjeta de crédito. Usas todas las funcionalidades del plan. Antes de que termine, te avisamos por correo y WhatsApp para que elijas seguir o darte de baja — sin cargos sorpresa.",
  },
  {
    q: "¿Funciona con el SII?",
    a: "Sí. Emites boleta electrónica (B2C) y factura electrónica (B2B con RUT) desde la misma pantalla de cobro. También soportamos receta retenida para medicamentos controlados.",
  },
  {
    q: "¿Qué pasa con mis datos si cancelo?",
    a: "Son tuyos. Exportas toda tu información en CSV o PDF antes de cancelar. Tras 30 días de cancelación eliminamos los datos de forma permanente.",
  },
  {
    q: "¿Puedo migrar desde Excel u otro sistema?",
    a: "Sí. Tenemos plantillas para importar clientes, mascotas y productos. Si estás migrando desde otro software, nuestro equipo te acompaña en el onboarding (incluido en Pro y Enterprise).",
  },
  {
    q: "¿Cuántos veterinarios caben en cada plan?",
    a: "Gratis: 1 vet. Pro: hasta 5. Enterprise: ilimitados. Los peluqueros y recepcionistas no cuentan dentro del límite.",
  },
  {
    q: "¿Cómo manejan las recetas retenidas?",
    a: "Cada receta queda marcada como retenida cuando corresponde, con una copia en PDF. El historial queda trazado por veterinario y por fecha, listo para fiscalización.",
  },
  {
    q: "¿Puedo usarlo desde mi celular?",
    a: "Sí. La app es responsive: la recepcionista puede usarla en tablet en el mostrador y el veterinario en el teléfono entre consultas.",
  },
  {
    q: "¿El peluquero ve la ficha clínica de los pacientes?",
    a: "No. Hay separación estricta a nivel de base de datos: el peluquero solo ve sus propias citas, servicios y notas de peluquería. Nunca accede a diagnósticos, tratamientos ni recetas.",
  },
  {
    q: "¿Hay soporte en español, por WhatsApp?",
    a: "Sí, por correo y WhatsApp, en horario de oficina (lunes a viernes 9-18h). Los planes Pro y Enterprise tienen respuesta prioritaria.",
  },
] as const;

const steps = [
  {
    icon: UserPlus,
    step: "1",
    title: "Regístrate",
    description: "Crea tu cuenta en 2 minutos. Sin tarjeta de crédito.",
  },
  {
    icon: Settings,
    step: "2",
    title: "Configura tu clínica",
    description:
      "Agrega tu equipo, servicios y horarios. Importa tus clientes si ya los tienes.",
  },
  {
    icon: Rocket,
    step: "3",
    title: "Empieza a atender",
    description: "Agenda, atiende y cobra desde el primer día.",
  },
] as const;

// ==================================================================
// Hero mockup (pulido, JSX)
// ==================================================================

function DashboardMockup() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-2xl ring-1 ring-primary/5">
      {/* Window chrome */}
      <div className="flex items-center gap-2 border-b border-border/40 bg-muted/50 px-4 py-2.5">
        <div className="flex gap-1.5">
          <div className="size-2.5 rounded-full bg-red-400" />
          <div className="size-2.5 rounded-full bg-yellow-400" />
          <div className="size-2.5 rounded-full bg-green-400" />
        </div>
        <div className="ml-3 flex gap-1">
          <div className="rounded-t-md bg-background px-3 py-1 text-[10px] font-medium text-foreground">
            Dashboard
          </div>
          <div className="rounded-t-md bg-muted/80 px-3 py-1 text-[10px] text-muted-foreground">
            Agenda
          </div>
          <div className="rounded-t-md bg-muted/80 px-3 py-1 text-[10px] text-muted-foreground">
            Fichas
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border/40 bg-background p-3">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-md bg-primary/10">
                <Users className="size-3.5 text-primary" />
              </div>
              <span className="text-[10px] text-muted-foreground">
                Pacientes
              </span>
            </div>
            <p className="mt-1.5 text-lg font-bold text-foreground">1.284</p>
            <div className="flex items-center gap-1">
              <TrendingUp className="size-3 text-primary" />
              <span className="text-[9px] text-primary">+12% este mes</span>
            </div>
          </div>

          <div className="rounded-xl border border-border/40 bg-background p-3">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-md bg-accent/30">
                <CalendarDays className="size-3.5 text-accent-foreground" />
              </div>
              <span className="text-[10px] text-muted-foreground">
                Citas hoy
              </span>
            </div>
            <p className="mt-1.5 text-lg font-bold text-foreground">18</p>
            <div className="flex items-center gap-1">
              <Clock className="size-3 text-muted-foreground" />
              <span className="text-[9px] text-muted-foreground">
                3 en curso · 2 listas
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-border/40 bg-background p-3">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-md bg-primary/10">
                <Receipt className="size-3.5 text-primary" />
              </div>
              <span className="text-[10px] text-muted-foreground">
                Ingresos
              </span>
            </div>
            <p className="mt-1.5 text-lg font-bold text-foreground">
              $4.290.000
            </p>
            <svg
              viewBox="0 0 80 20"
              className="mt-1 h-4 w-full text-primary"
              aria-hidden
            >
              <polyline
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points="0,14 12,12 24,13 36,9 48,10 60,6 72,7 80,3"
              />
            </svg>
          </div>
        </div>

        {/* Appointments list */}
        <div className="rounded-xl border border-border/40 bg-background">
          <div className="flex items-center justify-between border-b border-border/40 px-3 py-2">
            <span className="text-[10px] font-medium text-foreground">
              Próximas citas
            </span>
            <span className="text-[9px] text-muted-foreground">Hoy</span>
          </div>
          <div className="divide-y divide-border/30">
            {[
              {
                pet: "Luna",
                breed: "Golden retriever",
                type: "Control",
                time: "09:00",
                status: "confirmed",
              },
              {
                pet: "Max",
                breed: "Pastor alemán",
                type: "Vacuna",
                time: "09:30",
                status: "in_progress",
              },
              {
                pet: "Coco",
                breed: "Poodle",
                type: "Peluquería",
                time: "10:00",
                status: "ready_for_pickup",
              },
            ].map((apt) => (
              <div
                key={apt.pet}
                className="flex items-center justify-between px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <div className="flex size-6 items-center justify-center rounded-full bg-primary/15">
                    <PawPrint className="size-3 text-primary" />
                  </div>
                  <div className="leading-tight">
                    <p className="text-[10px] font-medium text-foreground">
                      {apt.pet}
                    </p>
                    <p className="text-[8px] text-muted-foreground">
                      {apt.breed}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className="h-4 px-1.5 text-[8px]"
                  >
                    {apt.type}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5">
                  <StatusChip status={apt.status} />
                  <span className="text-[10px] text-muted-foreground">
                    {apt.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    confirmed: {
      label: "Confirmada",
      className: "bg-primary/15 text-primary",
    },
    in_progress: {
      label: "En curso",
      className: "bg-accent/25 text-accent-foreground",
    },
    ready_for_pickup: {
      label: "Listo",
      className: "bg-amber-500/20 text-amber-700 dark:text-amber-300",
    },
  };
  const s = map[status] ?? map.confirmed;
  return (
    <span
      className={cn(
        "rounded-full px-1.5 py-[1px] text-[8px] font-medium",
        s.className
      )}
    >
      {s.label}
    </span>
  );
}

// ==================================================================
// Page
// ==================================================================

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* ============================================================ */}
      {/*  HERO                                                        */}
      {/* ============================================================ */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10"
          style={{
            backgroundImage:
              "radial-gradient(circle, var(--border) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-background via-background to-primary/5" />
        <div className="absolute right-0 top-0 -z-10 h-[500px] w-[500px] rounded-full bg-accent/15 blur-3xl" />
        <div className="absolute left-1/3 top-1/2 -z-10 h-[300px] w-[300px] rounded-full bg-amber-500/5 blur-3xl" />

        <div className="mx-auto max-w-7xl px-4 pb-20 pt-20 sm:px-6 sm:pb-28 sm:pt-28 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-[55fr_45fr] lg:gap-16">
            <div>
              <Badge
                variant="secondary"
                className="animate-fade-in-up mb-6 px-4 py-1.5 text-sm font-medium"
              >
                <Heart className="mr-1.5 size-3.5 fill-amber-400 text-amber-500" />
                Hecho en Chile, para clínicas chilenas
              </Badge>

              <h1 className="animate-fade-in-up animation-delay-200 text-pretty text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Menos papeleo.{" "}
                <span className="text-primary">Más mascotas</span> atendidas.
              </h1>

              <p className="animate-fade-in-up animation-delay-400 mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl">
                Agenda, ficha clínica, peluquería, facturación SII e inventario
                en una sola plataforma. Pensada para clínicas veterinarias en
                Chile que quieren enfocarse en sus pacientes, no en planillas.
              </p>

              <div className="animate-fade-in-up animation-delay-600 mt-8 flex flex-col items-start gap-4 sm:flex-row">
                <Link
                  href="/auth/register"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "h-12 px-8 text-base shadow-lg shadow-primary/20"
                  )}
                >
                  Probar 2 meses gratis
                  <ArrowRight className="ml-2 size-4" />
                </Link>
                <a
                  href="#precios"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "h-12 px-8 text-base"
                  )}
                >
                  Ver precios
                </a>
              </div>

              <p className="animate-fade-in-up animation-delay-600 mt-4 text-sm text-muted-foreground">
                Sin tarjeta de crédito · Listo en 5 minutos · Cancelas cuando
                quieras
              </p>

              <div className="animate-fade-in-up animation-delay-800 mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border/40 pt-6">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-primary" />
                  <span className="text-sm text-muted-foreground">
                    Datos protegidos
                  </span>
                </div>
                <div className="hidden h-4 w-px bg-border/60 sm:block" />
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-primary" />
                  <span className="text-sm text-muted-foreground">
                    Listo en 5 minutos
                  </span>
                </div>
                <div className="hidden h-4 w-px bg-border/60 sm:block" />
                <div className="flex items-center gap-2">
                  <PawPrint className="size-4 text-amber-500" />
                  <span className="text-sm text-muted-foreground">
                    Hecho con veterinarios
                  </span>
                </div>
                <div className="hidden h-4 w-px bg-border/60 sm:block" />
                <div className="flex items-center gap-2">
                  <Receipt className="size-4 text-primary" />
                  <span className="text-sm text-muted-foreground">
                    Cumple con SII
                  </span>
                </div>
              </div>
            </div>

            <div
              className="animate-slide-in-right animation-delay-400"
              style={{ perspective: "1200px" }}
            >
              <div style={{ transform: "rotateY(-6deg) rotateX(3deg)" }}>
                <DashboardMockup />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  TRUST BAR                                                    */}
      {/* ============================================================ */}
      <section className="border-y border-border/40 bg-muted/20 py-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 text-center sm:flex-row sm:justify-between sm:px-6 sm:text-left lg:px-8">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="size-4 text-amber-500" />
            Construido junto a una clínica veterinaria real en Santiago.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-muted-foreground">
            <span>4 roles integrados</span>
            <span className="hidden sm:inline">·</span>
            <span>100% SII Chile</span>
            <span className="hidden sm:inline">·</span>
            <span>RUT nativo</span>
            <span className="hidden sm:inline">·</span>
            <span>Dark mode</span>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  FEATURES — Bento grid                                        */}
      {/* ============================================================ */}
      <section id="funcionalidades" className="relative py-20 sm:py-28">
        <div
          className="absolute inset-0 -z-10 bg-muted/10"
          style={{
            backgroundImage:
              "radial-gradient(circle, var(--border) 0.5px, transparent 0.5px)",
            backgroundSize: "24px 24px",
          }}
        />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="secondary" className="mb-4">
              Funcionalidades
            </Badge>
            <h2 className="text-pretty text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Todo lo que tu clínica necesita,{" "}
              <span className="text-primary">nada que no uses</span>.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Herramientas integradas que simplifican tu día y mejoran la
              atención de tus pacientes.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {bigFeatures.map((feature) => (
              <Card
                key={feature.title}
                className="group border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <CardHeader>
                  <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-primary/10">
                    <feature.icon className="size-7 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">
                    {feature.description}
                  </CardDescription>
                  {feature.title.startsWith("Agenda") && (
                    <div className="mt-4 rounded-xl border border-border/40 bg-muted/30 p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="size-2 rounded-full bg-primary" />
                          <span className="text-xs font-medium">
                            Luna · Control
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          09:00
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="size-2 rounded-full bg-accent" />
                          <span className="text-xs font-medium">
                            Max · Vacuna
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          10:30
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="size-2 rounded-full bg-amber-400" />
                          <span className="text-xs font-medium">
                            Coco · Peluquería
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          14:00
                        </span>
                      </div>
                    </div>
                  )}
                  {feature.title.startsWith("Ficha clínica") && (
                    <div className="mt-4 rounded-xl border border-border/40 bg-muted/30 p-3">
                      <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                        <PawPrint className="size-3 text-primary" />
                        Luna · Golden retriever · 4 años
                      </div>
                      <div className="mt-2 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Syringe className="size-3 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">
                            Vacuna antirrábica · 15-03-2026
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Activity className="size-3 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">
                            Control general · 02-02-2026
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="size-3 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">
                            Receta retenida · 12-01-2026
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {smallFeatures.map((feature) => (
              <Card
                key={feature.title}
                className="group border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <CardHeader className="pb-2">
                  <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-primary/10">
                    <feature.icon className="size-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  UN DÍA EN TU CLÍNICA (reemplaza Roles)                       */}
      {/* ============================================================ */}
      <section
        id="para-tu-equipo"
        className="border-t border-border/40 bg-muted/10 py-20 sm:py-28"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="secondary" className="mb-4">
              Un día en tu clínica
            </Badge>
            <h2 className="text-pretty text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Cada persona del equipo ve{" "}
              <span className="text-primary">justo lo suyo</span>.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Sin módulos que no usan, sin datos sensibles donde no
              corresponde. El peluquero jamás ve la ficha médica.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {dayInClinic.map((item) => (
              <div
                key={item.who}
                className="group relative flex flex-col rounded-2xl border border-border/50 bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/10">
                  <item.icon className="size-6 text-primary" />
                </div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-primary">
                  {item.who}
                </div>
                <p className="mb-4 text-base font-semibold leading-snug text-foreground">
                  {item.headline}
                </p>
                <ul className="mt-auto space-y-2 text-sm text-muted-foreground">
                  {item.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  PRICING                                                      */}
      {/* ============================================================ */}
      <section id="precios" className="relative border-t border-border/40 py-20 sm:py-28">
        <div className="absolute left-1/2 top-0 -z-10 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-amber-500/5 blur-3xl" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="secondary" className="mb-4">
              Precios
            </Badge>
            <h2 className="text-pretty text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Precios simples,{" "}
              <span className="text-primary">sin letra chica</span>.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Empieza gratis. Cuando tu clínica crezca, elige el plan que
              calce. Cancelas cuando quieras.
            </p>
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {pricingTiers.map((tier) => (
              <div
                key={tier.name}
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

                <Link
                  href={tier.ctaHref}
                  className={cn(
                    buttonVariants({
                      size: "lg",
                      variant: tier.highlight ? "default" : "outline",
                    }),
                    "mt-6 w-full"
                  )}
                >
                  {tier.cta}
                  <ArrowRight className="ml-1.5 size-4" />
                </Link>
                {tier.trial && (
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    {tier.trial}
                  </p>
                )}

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
            ))}
          </div>

          <p className="mt-10 text-center text-sm text-muted-foreground">
            Precios en pesos chilenos, IVA incluido. Básico y Pro incluyen
            2 meses de prueba, sin tarjeta. Cancelas cuando quieras.
          </p>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  FAQ                                                          */}
      {/* ============================================================ */}
      <section id="faq" className="border-t border-border/40 bg-muted/10 py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Badge variant="secondary" className="mb-4">
              Preguntas frecuentes
            </Badge>
            <h2 className="text-pretty text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              ¿Dudas? <span className="text-primary">Resolvamos</span>.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Lo que más nos preguntan las clínicas chilenas. ¿No está tu
              pregunta?{" "}
              <a
                href="mailto:contacto@praxisvet.cl"
                className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
              >
                Escríbenos
              </a>
              .
            </p>
          </div>

          <div className="mt-12 rounded-2xl border border-border/60 bg-card p-2 sm:p-4">
            <Accordion className="divide-y divide-border/60">
              {faqs.map((faq) => (
                <AccordionItem
                  key={faq.q}
                  value={faq.q}
                  className="px-4 sm:px-6"
                >
                  <AccordionTrigger className="py-5 text-base font-semibold text-foreground hover:no-underline">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="pb-5 pr-8 text-sm leading-relaxed text-muted-foreground">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            <MessageCircle className="mr-1 inline size-4 text-primary" />
            También respondemos por WhatsApp de lunes a viernes, 9 a 18h.
          </p>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  HOW IT WORKS                                                 */}
      {/* ============================================================ */}
      <section
        id="como-funciona"
        className="border-t border-border/40 py-20 sm:py-28"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="secondary" className="mb-4">
              Primeros pasos
            </Badge>
            <h2 className="text-pretty text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Desde cero hasta la primera cita,{" "}
              <span className="text-primary">en minutos</span>.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              No es un ERP. No requiere consultoría. Tú y tu equipo lo
              configuran en una tarde.
            </p>
          </div>

          <div className="relative mt-14">
            <div className="absolute left-0 right-0 top-10 hidden h-px border-t-2 border-dashed border-primary/20 sm:block" />

            <div className="grid gap-8 sm:grid-cols-3">
              {steps.map((step) => (
                <div key={step.step} className="relative">
                  <div className="relative overflow-hidden rounded-2xl border-l-2 border-primary bg-card p-6 shadow-sm">
                    <span className="absolute -right-2 -top-4 text-6xl font-bold text-primary/5">
                      {step.step}
                    </span>
                    <div className="relative">
                      <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/10">
                        <step.icon className="size-5 text-primary" />
                      </div>
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-widest text-primary">
                        Paso {step.step}
                      </span>
                      <h3 className="text-xl font-semibold text-foreground">
                        {step.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  FINAL CTA                                                    */}
      {/* ============================================================ */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-[oklch(0.42_0.15_150)] px-8 py-16 text-center sm:px-16">
            <div
              className="absolute inset-0 opacity-5"
              style={{
                backgroundImage:
                  "radial-gradient(circle, white 1px, transparent 1px)",
                backgroundSize: "20px 20px",
              }}
            />
            <div className="absolute left-1/4 top-0 h-[300px] w-[300px] rounded-full bg-white/10 blur-3xl" />
            <div className="absolute bottom-0 right-1/4 h-[200px] w-[200px] rounded-full bg-amber-300/10 blur-3xl" />

            <div className="relative">
              <h2 className="text-pretty text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
                Tu clínica merece menos estrés y{" "}
                <span className="underline decoration-wavy decoration-amber-300/80 underline-offset-4">
                  más consultas
                </span>
                .
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-primary-foreground/80">
                Prueba PraxisVet 2 meses gratis, sin tarjeta de crédito.
                Cuando tu clínica ya no se imagine sin ella, eliges el plan.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  href="/auth/register"
                  className={cn(
                    buttonVariants({ variant: "secondary", size: "lg" }),
                    "h-12 px-8 text-base shadow-xl"
                  )}
                >
                  Empezar 2 meses gratis
                  <ArrowRight className="ml-2 size-4" />
                </Link>
                <a
                  href="#precios"
                  className="text-sm font-medium text-primary-foreground/90 underline underline-offset-4 hover:text-primary-foreground"
                >
                  Ver todos los planes
                </a>
              </div>
              <p className="mt-4 text-sm text-primary-foreground/60">
                Sin tarjeta de crédito · Soporte en español
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
