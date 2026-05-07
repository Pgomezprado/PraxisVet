import Link from "next/link";
import Image from "next/image";
import {
  PawPrint,
  Scissors,
  CalendarCheck,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatPetAge, formatTime } from "@/lib/utils/format";
import { formatSpecies } from "@/lib/validations/clients";
import type { HubGroomingPet } from "../queries";

function formatDateCL(date: string | null): string {
  if (!date) return "—";
  const [y, m, d] = date.split("-");
  if (!y || !m || !d) return date;
  return `${d}-${m}-${y}`;
}

function daysSince(date: string | null): number | null {
  if (!date) return null;
  const today = new Date();
  const past = new Date(date + "T12:00:00");
  if (Number.isNaN(past.getTime())) return null;
  return Math.round((today.getTime() - past.getTime()) / (1000 * 60 * 60 * 24));
}

function groomingHeroState(pet: HubGroomingPet) {
  if (pet.grooming.nextScheduledDate) {
    return {
      label: `Próxima peluquería ${formatDateCL(pet.grooming.nextScheduledDate)} · ${formatTime(pet.grooming.nextScheduledTime)}`,
      tone: "ok" as const,
      icon: CalendarCheck,
    };
  }
  if (pet.grooming.lastDate) {
    const since = daysSince(pet.grooming.lastDate);
    const sinceText =
      since === null
        ? formatDateCL(pet.grooming.lastDate)
        : since === 0
          ? "hoy"
          : since === 1
            ? "hace 1 día"
            : `hace ${since} días`;
    const tone = since !== null && since > 60 ? "warn" : "muted";
    return {
      label: `Último corte ${sinceText}`,
      tone: tone as "warn" | "muted",
      icon: Scissors,
    };
  }
  return {
    label: "Aún no hay peluquería registrada",
    tone: "muted" as const,
    icon: Scissors,
  };
}

export function GroomingPetCard({ pet }: { pet: HubGroomingPet }) {
  const age = formatPetAge(pet.birthdate);
  const hero = groomingHeroState(pet);
  const HeroIcon = hero.icon;

  const heroClasses =
    hero.tone === "warn"
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
            <HeroIcon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{hero.label}</span>
          </div>

          {pet.grooming.lastService && pet.grooming.lastDate && (
            <p className="text-xs text-muted-foreground">
              {pet.grooming.lastService}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
