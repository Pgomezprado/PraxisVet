"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Stethoscope,
  Scissors,
  Clock,
  Loader2,
} from "lucide-react";
import {
  formatTime,
  minutesUntil,
  formatCountdown,
} from "@/lib/utils/format";
import { updateAppointmentStatus } from "@/app/[clinic]/appointments/actions";
import type { TodayAppointment } from "@/app/[clinic]/dashboard/queries";

export function NextAppointmentCard({
  appointment,
  clinicSlug,
  emptyTitle = "Sin próximas citas",
  emptyDescription = "No tienes más citas programadas hoy.",
}: {
  appointment: TodayAppointment | null;
  clinicSlug: string;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!appointment) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted">
            <Clock className="size-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">{emptyTitle}</p>
          <p className="mt-1 max-w-xs text-xs text-muted-foreground">
            {emptyDescription}
          </p>
        </CardContent>
      </Card>
    );
  }

  const isGrooming = appointment.type === "grooming";
  const Icon = isGrooming ? Scissors : Stethoscope;
  const countdown = formatCountdown(minutesUntil(appointment.start_time));
  const actionLabel = isGrooming ? "Iniciar servicio" : "Iniciar consulta";

  async function handleStart() {
    if (!appointment || !appointment.client || !appointment.pet) return;
    setLoading(true);
    setError(null);

    const result = await updateAppointmentStatus(appointment.id, "in_progress");
    if (result.error) {
      setLoading(false);
      setError(result.error);
      return;
    }

    const base = `/${clinicSlug}/clients/${appointment.client.id}/pets/${appointment.pet.id}`;
    let target: string;
    if (isGrooming && appointment.linked_grooming_record_id) {
      target = `${base}/grooming/${appointment.linked_grooming_record_id}`;
    } else if (!isGrooming && appointment.linked_clinical_record_id) {
      target = `${base}/records/${appointment.linked_clinical_record_id}`;
    } else {
      target = isGrooming
        ? `${base}/grooming/new?appointment=${appointment.id}`
        : `${base}/records/new?appointment=${appointment.id}`;
    }
    router.push(target);
  }

  const canStart = !!appointment.client && !!appointment.pet;

  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {appointment.pet?.photo_url ? (
              <div className="relative size-10 shrink-0 overflow-hidden rounded-full border">
                <Image
                  src={appointment.pet.photo_url}
                  alt={appointment.pet.name}
                  fill
                  sizes="40px"
                  className="object-cover"
                />
              </div>
            ) : (
              <Icon className="size-5 text-primary" />
            )}
            <CardTitle className="text-base font-semibold">
              Próximo: {appointment.pet?.name ?? "Sin mascota"}
            </CardTitle>
          </div>
          <div className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
            {formatTime(appointment.start_time)} · {countdown}
          </div>
        </div>
        <CardDescription>
          {appointment.client
            ? `${appointment.client.first_name} ${appointment.client.last_name}`
            : "Sin cliente asignado"}
          {appointment.service && ` · ${appointment.service.name}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {appointment.reason && (
          <p className="mb-4 rounded-lg bg-background/60 p-3 text-sm text-muted-foreground">
            {appointment.reason}
          </p>
        )}
        {error && (
          <p className="mb-3 text-xs text-destructive">{error}</p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            className="gap-2"
            onClick={handleStart}
            disabled={loading || !canStart}
          >
            {loading ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Iniciando...
              </>
            ) : (
              <>
                {actionLabel}
                <ArrowRight className="size-3.5" />
              </>
            )}
          </Button>
          {appointment.pet && appointment.client && (
            <Link
              href={`/${clinicSlug}/clients/${appointment.client.id}/pets/${appointment.pet.id}`}
            >
              <Button size="sm" variant="outline">
                Ver ficha
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
