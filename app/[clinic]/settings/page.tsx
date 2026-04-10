import Link from "next/link";
import { Stethoscope, Users, Building2 } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

const sections = [
  {
    title: "Servicios",
    description: "Gestiona el catalogo de servicios que ofrece tu clinica.",
    href: "services",
    icon: Stethoscope,
  },
  {
    title: "Equipo",
    description: "Administra los miembros y roles de tu equipo.",
    href: "team",
    icon: Users,
    disabled: true,
  },
  {
    title: "Clinica",
    description: "Informacion general, horarios y datos de contacto.",
    href: "clinic",
    icon: Building2,
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
        <h1 className="text-2xl font-bold tracking-tight">Configuracion</h1>
        <p className="text-muted-foreground">
          Administra la configuracion de tu clinica.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => {
          const content = (
            <Card
              key={section.href}
              className={
                section.disabled
                  ? "opacity-50 cursor-not-allowed"
                  : "transition-colors hover:border-primary/50"
              }
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                    <section.icon className="size-5 text-muted-foreground" />
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
          );

          if (section.disabled) {
            return <div key={section.href}>{content}</div>;
          }

          return (
            <Link
              key={section.href}
              href={`/${clinic}/settings/${section.href}`}
            >
              {content}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
