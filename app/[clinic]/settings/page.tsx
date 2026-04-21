import Link from "next/link";
import { Stethoscope, Users, Building2, MessageCircle } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

const sections = [
  {
    title: "Servicios",
    description: "Gestiona el catálogo de servicios que ofrece tu clínica.",
    href: "services",
    icon: Stethoscope,
  },
  {
    title: "Equipo",
    description: "Administra los miembros y roles de tu equipo.",
    href: "team",
    icon: Users,
  },
  {
    title: "Clínica",
    description: "Información general, horarios y datos de contacto.",
    href: "clinic",
    icon: Building2,
  },
  {
    title: "Notificaciones",
    description: "Recordatorios automáticos por WhatsApp a tus clientes.",
    href: "notifications",
    icon: MessageCircle,
  },
];

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ clinic: string }>;
}) {
  const { clinic } = await params;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground">
          Administra la configuración de tu clínica.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={`/${clinic}/settings/${section.href}`}
          >
            <Card className="transition-colors hover:border-primary/50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    <section.icon className="size-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{section.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {section.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
