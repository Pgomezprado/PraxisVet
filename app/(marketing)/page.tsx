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
  CalendarDays,
  ClipboardList,
  Receipt,
  Package,
  Building2,
  ShieldCheck,
  UserPlus,
  Settings,
  Rocket,
  Check,
  PawPrint,
  ArrowRight,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Features data                                                      */
/* ------------------------------------------------------------------ */

const features = [
  {
    icon: CalendarDays,
    title: "Agenda de Citas",
    description:
      "Calendario inteligente con vista semanal y diaria. Asigna veterinarios, servicios y env\u00eda recordatorios autom\u00e1ticos.",
  },
  {
    icon: ClipboardList,
    title: "Historial Cl\u00ednico",
    description:
      "Expedientes digitales completos: signos vitales, diagn\u00f3sticos, vacunas, recetas y adjuntos en un solo lugar.",
  },
  {
    icon: Receipt,
    title: "Facturaci\u00f3n",
    description:
      "Genera facturas, registra pagos parciales o totales y exporta todo a PDF. Dashboard de ingresos en tiempo real.",
  },
  {
    icon: Package,
    title: "Inventario",
    description:
      "Control de stock con alertas autom\u00e1ticas. Registra entradas, salidas y vincula productos a recetas cl\u00ednicas.",
  },
  {
    icon: Building2,
    title: "Multi-Cl\u00ednica",
    description:
      "Gesti\u00f3n centralizada de varias sucursales. Cada cl\u00ednica opera de forma aislada con sus propios datos y equipo.",
  },
  {
    icon: ShieldCheck,
    title: "Seguridad Total",
    description:
      "Datos protegidos con Row Level Security. Cada cl\u00ednica accede \u00fanicamente a su informaci\u00f3n, garantizado a nivel de base de datos.",
  },
];

/* ------------------------------------------------------------------ */
/*  Steps data                                                         */
/* ------------------------------------------------------------------ */

const steps = [
  {
    icon: UserPlus,
    step: "01",
    title: "Reg\u00edstrate",
    description:
      "Crea tu cuenta en segundos. Sin tarjeta de cr\u00e9dito, sin compromisos.",
  },
  {
    icon: Settings,
    step: "02",
    title: "Configura tu cl\u00ednica",
    description:
      "Agrega tu equipo, servicios, horarios y personaliza tu espacio de trabajo.",
  },
  {
    icon: Rocket,
    step: "03",
    title: "Empieza a gestionar",
    description:
      "Agenda citas, atiende pacientes y lleva el control de tu cl\u00ednica desde el primer d\u00eda.",
  },
];

/* ------------------------------------------------------------------ */
/*  Pricing data                                                       */
/* ------------------------------------------------------------------ */

const plans = [
  {
    name: "Gratis",
    price: "$0",
    period: "por siempre",
    description: "Ideal para cl\u00ednicas peque\u00f1as que est\u00e1n empezando.",
    features: [
      "Hasta 1 veterinario",
      "50 pacientes",
      "Agenda de citas b\u00e1sica",
      "Historial cl\u00ednico",
    ],
    cta: "Comenzar gratis",
    popular: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "USD / mes",
    description: "Para cl\u00ednicas en crecimiento que necesitan m\u00e1s poder.",
    features: [
      "Hasta 5 veterinarios",
      "Pacientes ilimitados",
      "Facturaci\u00f3n y cobros",
      "Inventario completo",
      "Recordatorios por email",
      "Exportaci\u00f3n PDF",
      "Soporte prioritario",
    ],
    cta: "Comenzar prueba gratis",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "$79",
    period: "USD / mes",
    description: "Para redes de cl\u00ednicas y hospitales veterinarios.",
    features: [
      "Veterinarios ilimitados",
      "Multi-cl\u00ednica",
      "API personalizada",
      "Integraciones avanzadas",
      "Soporte dedicado 24/7",
      "SLA garantizado",
      "Onboarding personalizado",
    ],
    cta: "Contactar ventas",
    popular: false,
  },
];

/* ================================================================== */
/*  Page Component                                                     */
/* ================================================================== */

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* ============================================================ */}
      {/*  HERO                                                        */}
      {/* ============================================================ */}
      <section className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/4 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute right-0 top-1/2 h-[400px] w-[400px] -translate-y-1/2 rounded-full bg-accent/40 blur-3xl" />
        </div>

        <div className="mx-auto max-w-7xl px-4 pb-20 pt-24 sm:px-6 sm:pb-28 sm:pt-32 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <Badge
              variant="secondary"
              className="mb-6 px-4 py-1.5 text-sm font-medium"
            >
              <PawPrint className="mr-1.5 size-3.5" />
              Plataforma veterinaria todo-en-uno
            </Badge>

            <h1 className="text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Gestiona tu cl\u00ednica veterinaria{" "}
              <span className="text-primary">sin complicaciones</span>
            </h1>

            <p className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Citas, historial cl\u00ednico, facturaci\u00f3n e inventario en una sola
              plataforma. Diseñada para veterinarios que quieren enfocarse en lo
              que importa: el cuidado de sus pacientes.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/auth/register"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "h-12 px-8 text-base"
                )}
              >
                Comenzar gratis
                <ArrowRight className="ml-2 size-4" />
              </Link>
              <a
                href="#funcionalidades"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "h-12 px-8 text-base"
                )}
              >
                Ver funcionalidades
              </a>
            </div>

            <p className="mt-4 text-sm text-muted-foreground">
              Sin tarjeta de cr\u00e9dito &middot; Configuraci\u00f3n en 5 minutos
            </p>
          </div>

          {/* Hero visual placeholder */}
          <div className="mx-auto mt-16 max-w-5xl overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/5 via-background to-accent/20 shadow-xl">
            <div className="flex h-[340px] items-center justify-center sm:h-[420px]">
              <div className="text-center">
                <PawPrint className="mx-auto size-16 text-primary/30" />
                <p className="mt-4 text-sm text-muted-foreground">
                  Vista previa del dashboard
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  FEATURES                                                    */}
      {/* ============================================================ */}
      <section
        id="funcionalidades"
        className="border-t border-border/40 bg-muted/20 py-20 sm:py-28"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Todo lo que necesitas para tu cl\u00ednica
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Herramientas integradas que simplifican tu d\u00eda a d\u00eda y mejoran la
              atenci\u00f3n de tus pacientes.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="border-border/50 bg-card/80 backdrop-blur-sm transition-shadow hover:shadow-md"
              >
                <CardHeader>
                  <div className="mb-2 flex size-11 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="size-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
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
      {/*  HOW IT WORKS                                                */}
      {/* ============================================================ */}
      <section id="como-funciona" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Empieza en 3 simples pasos
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Desde el registro hasta tu primera cita en minutos, no en d\u00edas.
            </p>
          </div>

          <div className="mt-14 grid gap-8 sm:grid-cols-3">
            {steps.map((step) => (
              <div key={step.step} className="relative text-center">
                <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10">
                  <step.icon className="size-6 text-primary" />
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
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  PRICING                                                     */}
      {/* ============================================================ */}
      <section
        id="precios"
        className="border-t border-border/40 bg-muted/20 py-20 sm:py-28"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Planes para cada cl\u00ednica
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Empieza gratis y escala cuando lo necesites. Sin sorpresas.
            </p>
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={cn(
                  "relative flex flex-col border-border/50 bg-card/80 backdrop-blur-sm",
                  plan.popular && "ring-2 ring-primary shadow-lg"
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="px-3 py-0.5 text-xs">M\u00e1s popular</Badge>
                  </div>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <div className="mt-2">
                    <span className="text-4xl font-bold text-foreground">
                      {plan.price}
                    </span>
                    <span className="ml-1 text-sm text-muted-foreground">
                      {plan.period}
                    </span>
                  </div>
                  <CardDescription className="mt-2">
                    {plan.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                  <ul className="flex-1 space-y-3">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/auth/register"
                    className={cn(
                      buttonVariants({
                        variant: plan.popular ? "default" : "outline",
                      }),
                      "mt-8 w-full"
                    )}
                  >
                    {plan.cta}
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  FINAL CTA                                                   */}
      {/* ============================================================ */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-primary px-8 py-16 text-center sm:px-16">
            <div className="absolute inset-0 -z-10">
              <div className="absolute left-1/4 top-0 h-[300px] w-[300px] rounded-full bg-white/10 blur-3xl" />
              <div className="absolute bottom-0 right-1/4 h-[200px] w-[200px] rounded-full bg-white/5 blur-3xl" />
            </div>

            <h2 className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
              Lleva tu cl\u00ednica al siguiente nivel
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-primary-foreground/80">
              \u00danete a las cl\u00ednicas que ya conf\u00edan en PraxisVet para gestionar su
              d\u00eda a d\u00eda. Empieza gratis hoy.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/auth/register"
                className={cn(
                  buttonVariants({ variant: "secondary", size: "lg" }),
                  "h-12 px-8 text-base"
                )}
              >
                Crear cuenta gratis
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
