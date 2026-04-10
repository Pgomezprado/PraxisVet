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
  Star,
  Activity,
  Users,
  TrendingUp,
  Syringe,
  Clock,
} from "lucide-react";

const features = [
  {
    icon: CalendarDays,
    title: "Agenda de Citas",
    description:
      "Calendario inteligente con vista semanal y diaria. Asigna veterinarios, servicios y envia recordatorios automaticos.",
    large: true,
  },
  {
    icon: ClipboardList,
    title: "Historial Clinico",
    description:
      "Expedientes digitales completos: signos vitales, diagnosticos, vacunas, recetas y adjuntos en un solo lugar.",
    large: true,
  },
  {
    icon: Receipt,
    title: "Facturacion",
    description:
      "Genera facturas, registra pagos parciales o totales y exporta todo a PDF. Dashboard de ingresos en tiempo real.",
    large: false,
  },
  {
    icon: Package,
    title: "Inventario",
    description:
      "Control de stock con alertas automaticas. Registra entradas, salidas y vincula productos a recetas clinicas.",
    large: false,
  },
  {
    icon: Building2,
    title: "Multi-Clinica",
    description:
      "Gestion centralizada de varias sucursales con datos aislados por clinica.",
    large: false,
  },
  {
    icon: ShieldCheck,
    title: "Seguridad Total",
    description:
      "Row Level Security garantiza que cada clinica accede unicamente a su informacion.",
    large: false,
  },
];

const steps = [
  {
    icon: UserPlus,
    step: "1",
    title: "Registrate",
    description:
      "Crea tu cuenta en segundos. Sin tarjeta de credito, sin compromisos.",
  },
  {
    icon: Settings,
    step: "2",
    title: "Configura tu clinica",
    description:
      "Agrega tu equipo, servicios, horarios y personaliza tu espacio de trabajo.",
  },
  {
    icon: Rocket,
    step: "3",
    title: "Empieza a gestionar",
    description:
      "Agenda citas, atiende pacientes y lleva el control desde el primer dia.",
  },
];

const plans = [
  {
    name: "Gratis",
    price: "$0",
    period: "por siempre",
    description: "Ideal para clinicas pequenas que estan empezando.",
    features: [
      "Hasta 1 veterinario",
      "50 pacientes",
      "Agenda de citas basica",
      "Historial clinico",
    ],
    cta: "Comenzar gratis",
    href: "/auth/register",
    popular: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "USD / mes",
    description: "Para clinicas en crecimiento que necesitan mas poder.",
    features: [
      "Hasta 5 veterinarios",
      "Pacientes ilimitados",
      "Facturacion y cobros",
      "Inventario completo",
      "Recordatorios por email",
      "Exportacion PDF",
      "Soporte prioritario",
    ],
    cta: "Comenzar prueba gratis",
    href: "/auth/register",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "$79",
    period: "USD / mes",
    description: "Para redes de clinicas y hospitales veterinarios.",
    features: [
      "Veterinarios ilimitados",
      "Multi-clinica",
      "API personalizada",
      "Integraciones avanzadas",
      "Soporte dedicado 24/7",
      "SLA garantizado",
      "Onboarding personalizado",
    ],
    cta: "Contactar ventas",
    href: "mailto:ventas@praxisvet.cl",
    popular: false,
  },
];

function DashboardMockup() {
  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-2xl">
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
        </div>
      </div>

      <div className="p-4">
        <div className="mb-4 grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-border/40 bg-background p-3">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-md bg-primary/10">
                <Users className="size-3.5 text-primary" />
              </div>
              <span className="text-[10px] text-muted-foreground">
                Pacientes
              </span>
            </div>
            <p className="mt-1.5 text-lg font-bold text-foreground">1,284</p>
            <div className="flex items-center gap-1">
              <TrendingUp className="size-3 text-green-500" />
              <span className="text-[9px] text-green-600">+12%</span>
            </div>
          </div>

          <div className="rounded-lg border border-border/40 bg-background p-3">
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
              <span className="text-[9px] text-muted-foreground">3 pend.</span>
            </div>
          </div>

          <div className="rounded-lg border border-border/40 bg-background p-3">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-md bg-primary/10">
                <Receipt className="size-3.5 text-primary" />
              </div>
              <span className="text-[10px] text-muted-foreground">
                Ingresos
              </span>
            </div>
            <p className="mt-1.5 text-lg font-bold text-foreground">$4.2M</p>
            <div className="flex items-center gap-1">
              <TrendingUp className="size-3 text-green-500" />
              <span className="text-[9px] text-green-600">+8%</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border/40 bg-background">
          <div className="border-b border-border/40 px-3 py-2">
            <span className="text-[10px] font-medium text-foreground">
              Proximas citas
            </span>
          </div>
          <div className="divide-y divide-border/30">
            {[
              {
                pet: "Luna",
                type: "Control",
                time: "09:00",
                color: "bg-primary",
              },
              {
                pet: "Max",
                type: "Vacuna",
                time: "09:30",
                color: "bg-accent",
              },
              {
                pet: "Coco",
                type: "Cirugia",
                time: "10:00",
                color: "bg-primary",
              },
            ].map((apt) => (
              <div
                key={apt.pet}
                className="flex items-center justify-between px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn("size-1.5 rounded-full", apt.color)}
                  />
                  <span className="text-[10px] font-medium text-foreground">
                    {apt.pet}
                  </span>
                  <Badge
                    variant="secondary"
                    className="h-4 px-1.5 text-[8px]"
                  >
                    {apt.type}
                  </Badge>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {apt.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

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

        <div className="mx-auto max-w-7xl px-4 pb-20 pt-20 sm:px-6 sm:pb-28 sm:pt-28 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-[55fr_45fr] lg:gap-16">
            <div>
              <Badge
                variant="secondary"
                className="animate-fade-in-up mb-6 px-4 py-1.5 text-sm font-medium"
              >
                <Star className="mr-1.5 size-3.5 fill-accent text-accent" />
                Plataforma #1 en LATAM
              </Badge>

              <h1 className="animate-fade-in-up animation-delay-200 text-pretty text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                La gestion veterinaria que tus pacientes{" "}
                <span className="text-primary">merecen</span>
              </h1>

              <p className="animate-fade-in-up animation-delay-400 mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl">
                Citas, historial clinico, facturacion e inventario en una sola
                plataforma. Disenada para veterinarios que quieren enfocarse en
                lo que importa: el cuidado de sus pacientes.
              </p>

              <div className="animate-fade-in-up animation-delay-600 mt-8 flex flex-col items-start gap-4 sm:flex-row">
                <Link
                  href="/auth/register"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "h-12 px-8 text-base shadow-lg shadow-primary/20"
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
                  Ver demo
                </a>
              </div>

              <p className="animate-fade-in-up animation-delay-600 mt-4 text-sm text-muted-foreground">
                Sin tarjeta de credito &middot; Configuracion en 5 minutos
              </p>

              <div className="animate-fade-in-up animation-delay-800 mt-8 flex flex-wrap items-center gap-6 border-t border-border/40 pt-6">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Datos protegidos</span>
                </div>
                <div className="h-4 w-px bg-border/60" />
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Listo en 5 minutos</span>
                </div>
                <div className="h-4 w-px bg-border/60" />
                <div className="flex items-center gap-2">
                  <PawPrint className="size-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Hecho para veterinarios</span>
                </div>
              </div>
            </div>

            <div
              className="animate-slide-in-right animation-delay-400"
              style={{
                perspective: "1200px",
              }}
            >
              <div
                style={{
                  transform: "rotateY(-6deg) rotateX(3deg)",
                }}
              >
                <DashboardMockup />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  FEATURES — Bento grid                                       */}
      {/* ============================================================ */}
      <section
        id="funcionalidades"
        className="relative py-20 sm:py-28"
      >
        <div
          className="absolute inset-0 -z-10 bg-muted/20"
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
              Todo lo que necesitas para tu clinica
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Herramientas integradas que simplifican tu dia a dia y mejoran la
              atencion de tus pacientes.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2">
            {features.filter((f) => f.large).map((feature) => (
              <Card
                key={feature.title}
                className="group border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <CardHeader>
                  <div className="mb-3 flex size-14 items-center justify-center rounded-xl bg-primary/10">
                    <feature.icon className="size-7 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">
                    {feature.description}
                  </CardDescription>
                  {feature.title === "Agenda de Citas" && (
                    <div className="mt-4 rounded-lg border border-border/40 bg-muted/30 p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="size-2 rounded-full bg-primary" />
                          <span className="text-xs font-medium">Luna - Control</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">09:00</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="size-2 rounded-full bg-accent" />
                          <span className="text-xs font-medium">Max - Vacuna</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">10:30</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="size-2 rounded-full bg-primary/60" />
                          <span className="text-xs font-medium">Coco - Cirugia</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">14:00</span>
                      </div>
                    </div>
                  )}
                  {feature.title === "Historial Clinico" && (
                    <div className="mt-4 rounded-lg border border-border/40 bg-muted/30 p-3">
                      <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                        <PawPrint className="size-3 text-primary" />
                        Luna - Golden Retriever
                      </div>
                      <div className="mt-2 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Syringe className="size-3 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">Vacuna antirrAbica - 15/03</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Activity className="size-3 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">Control general - 02/02</span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.filter((f) => !f.large).map((feature) => (
              <Card
                key={feature.title}
                className="group border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <CardHeader className="pb-2">
                  <div className="mb-2 flex size-11 items-center justify-center rounded-lg bg-primary/10">
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
      {/*  HOW IT WORKS — Timeline                                     */}
      {/* ============================================================ */}
      <section id="como-funciona" className="border-t border-border/40 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="secondary" className="mb-4">
              Primeros pasos
            </Badge>
            <h2 className="text-pretty text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Empieza en 3 simples pasos
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Desde el registro hasta tu primera cita en minutos, no en dias.
            </p>
          </div>

          <div className="relative mt-14">
            <div className="absolute left-0 right-0 top-10 hidden h-px border-t-2 border-dashed border-primary/20 sm:block" />

            <div className="grid gap-8 sm:grid-cols-3">
              {steps.map((step) => (
                <div key={step.step} className="relative">
                  <div className="relative overflow-hidden rounded-xl border-l-2 border-primary bg-card p-6 shadow-sm">
                    <span className="absolute -right-2 -top-4 text-6xl font-bold text-primary/5">
                      {step.step}
                    </span>
                    <div className="relative">
                      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10">
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
      {/*  PRICING                                                     */}
      {/* ============================================================ */}
      <section
        id="precios"
        className="bg-gradient-to-b from-background to-secondary/40 py-20 sm:py-28"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="secondary" className="mb-4">
              Precios
            </Badge>
            <h2 className="text-pretty text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Planes para cada clinica
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Empieza gratis y escala cuando lo necesites. Sin sorpresas.
            </p>
          </div>

          <div className="mt-14 grid items-start gap-6 lg:grid-cols-3">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={cn(
                  "relative flex flex-col border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300",
                  plan.popular &&
                    "scale-105 ring-2 ring-primary shadow-xl z-10"
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-accent px-3 py-0.5 text-xs text-accent-foreground hover:bg-accent/90">
                      Mas popular
                    </Badge>
                  </div>
                )}
                <CardHeader
                  className={cn(
                    "text-center",
                    plan.popular &&
                      "bg-gradient-to-b from-primary/5 to-transparent"
                  )}
                >
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
                    href={plan.href}
                    className={cn(
                      buttonVariants({
                        variant: plan.popular ? "default" : "outline",
                      }),
                      "mt-8 w-full",
                      plan.popular && "shadow-lg shadow-primary/20"
                    )}
                  >
                    {plan.cta}
                    {plan.popular && <ArrowRight className="ml-2 size-4" />}
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Necesitas algo diferente?{" "}
            <a
              href="mailto:ventas@praxisvet.cl"
              className="font-medium text-primary underline underline-offset-2 hover:text-primary/80"
            >
              Conversemos
              <ArrowRight className="ml-1 inline size-3" />
            </a>
          </p>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  FINAL CTA                                                   */}
      {/* ============================================================ */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--primary)] via-[oklch(0.38_0.10_195)] to-[oklch(0.42_0.12_210)] px-8 py-16 text-center sm:px-16"
          >
            <div
              className="absolute inset-0 opacity-5"
              style={{
                backgroundImage:
                  "radial-gradient(circle, white 1px, transparent 1px)",
                backgroundSize: "20px 20px",
              }}
            />
            <div className="absolute left-1/4 top-0 h-[300px] w-[300px] rounded-full bg-white/10 blur-3xl" />
            <div className="absolute bottom-0 right-1/4 h-[200px] w-[200px] rounded-full bg-white/5 blur-3xl" />

            <div className="relative">
              <h2 className="text-pretty text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
                Empieza hoy, sin compromiso
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-primary-foreground/80">
                Tu clinica merece una gestion moderna. Pruebalo gratis.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  href="/auth/register"
                  className={cn(
                    buttonVariants({ variant: "secondary", size: "lg" }),
                    "h-12 px-8 text-base shadow-xl"
                  )}
                >
                  Crear cuenta gratis
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </div>
              <p className="mt-4 text-sm text-primary-foreground/60">
                Sin tarjeta de credito &middot; Soporte en espanol
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
