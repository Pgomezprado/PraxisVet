import Link from "next/link";
import Image from "next/image";
import { MapPin, Phone, Scissors, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { GroomingClinicDirectoryEntry } from "../queries";

export function GroomingDirectoryCard({
  clinic,
}: {
  clinic: GroomingClinicDirectoryEntry;
}) {
  const initials = clinic.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <Card className="overflow-hidden">
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-start gap-4">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-primary/10">
            {clinic.logo_url ? (
              <Image
                src={clinic.logo_url}
                alt={clinic.name}
                fill
                sizes="56px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-primary">
                {initials || "PV"}
              </div>
            )}
          </div>
          <div className="flex-1 space-y-1">
            <h3 className="text-base font-semibold leading-tight">
              {clinic.name}
            </h3>
            <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Scissors className="h-3 w-3" />
              {clinic.groomer_count}{" "}
              {clinic.groomer_count === 1 ? "peluquero/a" : "peluqueros/as"}
            </p>
          </div>
        </div>

        <div className="space-y-1.5 text-sm text-muted-foreground">
          {clinic.address && (
            <p className="inline-flex items-start gap-1.5">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{clinic.address}</span>
            </p>
          )}
          {clinic.phone && (
            <p className="inline-flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <a
                href={`tel:${clinic.phone}`}
                className="transition-colors hover:text-foreground"
              >
                {clinic.phone}
              </a>
            </p>
          )}
        </div>

        <div className="flex justify-end pt-1">
          <Button
            size="sm"
            render={<Link href={`/tutor/${clinic.slug}?from=hub`} />}
          >
            <Scissors className="h-3.5 w-3.5" />
            Reservar hora
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
