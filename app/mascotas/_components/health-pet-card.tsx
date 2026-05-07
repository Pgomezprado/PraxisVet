import Link from "next/link";
import Image from "next/image";
import { PawPrint, Syringe, Bug, FileText, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPetAge } from "@/lib/utils/format";
import { formatSpecies } from "@/lib/validations/clients";
import type { HubHealthPet } from "../queries";

function formatDateCL(date: string | null): string {
  if (!date) return "—";
  const [y, m, d] = date.split("-");
  if (!y || !m || !d) return date;
  return `${d}-${m}-${y}`;
}

function vaccHeroState(nextDue: string | null) {
  if (!nextDue) {
    return {
      label: "Sin próxima vacuna registrada",
      tone: "muted" as const,
    };
  }
  const today = new Date().toISOString().slice(0, 10);
  const due = new Date(nextDue + "T12:00:00");
  const now = new Date(today + "T12:00:00");
  const diffDays = Math.round(
    (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays < 0) {
    return {
      label: `Vacuna vencida hace ${Math.abs(diffDays)} ${Math.abs(diffDays) === 1 ? "día" : "días"}`,
      tone: "alert" as const,
    };
  }
  if (diffDays === 0)
    return { label: "Toca vacuna hoy", tone: "alert" as const };
  if (diffDays <= 14)
    return {
      label: `Próxima vacuna en ${diffDays} ${diffDays === 1 ? "día" : "días"}`,
      tone: "warn" as const,
    };
  return {
    label: `Próxima vacuna ${formatDateCL(nextDue)}`,
    tone: "ok" as const,
  };
}

export function HealthPetCard({ pet }: { pet: HubHealthPet }) {
  const age = formatPetAge(pet.birthdate);
  const hero = vaccHeroState(pet.vaccinations.nextDue);

  const heroClasses =
    hero.tone === "alert"
      ? "border-destructive/40 bg-destructive/5 text-destructive"
      : hero.tone === "warn"
        ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
        : hero.tone === "ok"
          ? "border-primary/30 bg-primary/5 text-primary"
          : "border-border/60 bg-muted/40 text-muted-foreground";

  return (
    <Link
      href={`/mascotas/${pet.id}`}
      className="group block focus:outline-none"
      aria-label={`Abrir ficha de ${pet.name}`}
    >
      <Card className="h-full overflow-hidden transition-all group-hover:-translate-y-0.5 group-hover:shadow-lg group-focus-visible:ring-2 group-focus-visible:ring-ring">
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="flex items-start gap-4">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-primary/10">
              {pet.photo_url ? (
                <Image
                  src={pet.photo_url}
                  alt={pet.name}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-primary">
                  <PawPrint className="h-7 w-7" />
                </div>
              )}
            </div>
            <div className="flex-1 space-y-0.5">
              <h3 className="text-lg font-semibold leading-tight">
                {pet.name}
              </h3>
              <p className="text-xs text-muted-foreground">
                {[formatSpecies(pet.species), age].filter(Boolean).join(" · ")}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </div>

          <div
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${heroClasses}`}
          >
            <Syringe className="h-4 w-4 shrink-0" />
            <span className="flex-1">{hero.label}</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Bug className="h-3.5 w-3.5" />
              {pet.dewormings.nextDue
                ? `Desp. ${formatDateCL(pet.dewormings.nextDue)}`
                : "Sin desparasitación próxima"}
            </span>
            {pet.sharedExams.count > 0 && (
              <Badge variant="outline" className="font-normal">
                <FileText className="h-3 w-3" />
                {pet.sharedExams.count}{" "}
                {pet.sharedExams.count === 1 ? "examen" : "exámenes"}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
