"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { appointmentSchema, type AppointmentInput } from "@/lib/validations/appointments";
import {
  createAppointment,
  updateAppointment,
  checkConflicts,
  getVetDayAppointments,
} from "@/app/[clinic]/appointments/actions";
import type { AppointmentWithRelations } from "@/app/[clinic]/appointments/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Clock, Loader2 } from "lucide-react";

type ClientWithPets = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  pets: { id: string; name: string; species: string | null; breed: string | null; active: boolean }[];
};

type Vet = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  specialty: string | null;
};

type ServiceOption = {
  id: string;
  name: string;
  duration_minutes: number;
  price: number | null;
  category: string | null;
};

type VetDayAppointment = {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  pet: { id: string; name: string };
};

interface AppointmentFormProps {
  orgId: string;
  clinicSlug: string;
  clients: ClientWithPets[];
  vets: Vet[];
  services: ServiceOption[];
  defaultValues?: Partial<AppointmentInput>;
  appointmentId?: string;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive mt-1">{message}</p>;
}

function formatTime(time: string): string {
  return time.slice(0, 5);
}

export function AppointmentForm({
  orgId,
  clinicSlug,
  clients,
  vets,
  services,
  defaultValues,
  appointmentId,
}: AppointmentFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<AppointmentWithRelations[]>([]);
  const [checkingConflicts, setCheckingConflicts] = useState(false);
  const [vetDayAppointments, setVetDayAppointments] = useState<VetDayAppointment[]>([]);
  const [loadingVetDay, setLoadingVetDay] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isEditing = !!appointmentId;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AppointmentInput>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      client_id: "",
      pet_id: "",
      vet_id: "",
      service_id: "",
      date: new Date().toISOString().split("T")[0],
      start_time: "",
      end_time: "",
      reason: "",
      notes: "",
      ...defaultValues,
    },
  });

  const selectedClientId = watch("client_id");
  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const availablePets = selectedClient?.pets ?? [];

  const watchedVetId = watch("vet_id");
  const watchedDate = watch("date");
  const watchedStartTime = watch("start_time");
  const watchedEndTime = watch("end_time");

  const selectedVet = vets.find((v) => v.id === watchedVetId);
  const vetDisplayName = selectedVet
    ? [selectedVet.first_name, selectedVet.last_name].filter(Boolean).join(" ")
    : "";

  const doCheckConflicts = useCallback(async () => {
    if (!watchedVetId || !watchedDate || !watchedStartTime || !watchedEndTime) {
      setConflicts([]);
      return;
    }
    if (watchedEndTime <= watchedStartTime) {
      setConflicts([]);
      return;
    }

    setCheckingConflicts(true);
    const result = await checkConflicts(orgId, {
      vet_id: watchedVetId,
      date: watchedDate,
      start_time: watchedStartTime,
      end_time: watchedEndTime,
      exclude_id: appointmentId,
    });
    setCheckingConflicts(false);

    if (!result.error && result.data) {
      setConflicts(result.data);
    } else {
      setConflicts([]);
    }
  }, [watchedVetId, watchedDate, watchedStartTime, watchedEndTime, orgId, appointmentId]);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      doCheckConflicts();
    }, 500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [doCheckConflicts]);

  useEffect(() => {
    if (!watchedVetId || !watchedDate) {
      setVetDayAppointments([]);
      return;
    }

    let cancelled = false;
    setLoadingVetDay(true);

    getVetDayAppointments(orgId, watchedVetId, watchedDate).then((result) => {
      if (cancelled) return;
      setLoadingVetDay(false);
      if (!result.error && result.data) {
        const mapped: VetDayAppointment[] = (result.data as unknown as VetDayAppointment[])
          .filter((a) => !appointmentId || a.id !== appointmentId);
        setVetDayAppointments(mapped);
      } else {
        setVetDayAppointments([]);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [watchedVetId, watchedDate, orgId, appointmentId]);

  async function onSubmit(data: AppointmentInput) {
    setServerError(null);

    const result = isEditing
      ? await updateAppointment(appointmentId, data)
      : await createAppointment(orgId, data);

    if (result.error) {
      setServerError(result.error);
      return;
    }

    if (isEditing) {
      router.push(`/${clinicSlug}/appointments/${appointmentId}`);
    } else {
      router.push(`/${clinicSlug}/appointments`);
    }
  }

  function handleServiceChange(serviceId: string) {
    setValue("service_id", serviceId);

    if (!serviceId) return;

    const service = services.find((s) => s.id === serviceId);
    if (service && watch("start_time")) {
      const [hours, minutes] = watch("start_time").split(":").map(Number);
      const endDate = new Date(2000, 0, 1, hours, minutes + service.duration_minutes);
      const endTime = `${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}`;
      setValue("end_time", endTime);
    }
  }

  function handleClientChange(clientId: string) {
    setValue("client_id", clientId);
    setValue("pet_id", "");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? "Editar cita" : "Nueva cita"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {serverError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {serverError}
            </div>
          )}

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="client_id">Cliente *</Label>
              <Select
                id="client_id"
                {...register("client_id")}
                onChange={(e) => handleClientChange(e.target.value)}
                aria-invalid={!!errors.client_id}
              >
                <option value="">Seleccionar cliente</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.first_name} {client.last_name}
                    {client.phone ? ` - ${client.phone}` : ""}
                  </option>
                ))}
              </Select>
              <FieldError message={errors.client_id?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pet_id">Mascota *</Label>
              <Select
                id="pet_id"
                {...register("pet_id")}
                disabled={!selectedClientId}
                aria-invalid={!!errors.pet_id}
              >
                <option value="">
                  {selectedClientId
                    ? availablePets.length === 0
                      ? "Sin mascotas registradas"
                      : "Seleccionar mascota"
                    : "Selecciona un cliente primero"}
                </option>
                {availablePets.map((pet) => (
                  <option key={pet.id} value={pet.id}>
                    {pet.name}
                    {pet.species ? ` (${pet.species})` : ""}
                  </option>
                ))}
              </Select>
              <FieldError message={errors.pet_id?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vet_id">Veterinario *</Label>
              <Select
                id="vet_id"
                {...register("vet_id")}
                aria-invalid={!!errors.vet_id}
              >
                <option value="">Seleccionar veterinario</option>
                {vets.map((vet) => (
                  <option key={vet.id} value={vet.id}>
                    {[vet.first_name, vet.last_name].filter(Boolean).join(" ")}
                    {vet.specialty ? ` - ${vet.specialty}` : ""}
                  </option>
                ))}
              </Select>
              <FieldError message={errors.vet_id?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="service_id">Servicio</Label>
              <Select
                id="service_id"
                {...register("service_id")}
                onChange={(e) => handleServiceChange(e.target.value)}
              >
                <option value="">Sin servicio</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                    {service.price != null ? ` - $${service.price}` : ""}
                    {` (${service.duration_minutes} min)`}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Fecha *</Label>
              <Input
                id="date"
                type="date"
                {...register("date")}
                aria-invalid={!!errors.date}
              />
              <FieldError message={errors.date?.message} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="start_time">Hora inicio *</Label>
                <Input
                  id="start_time"
                  type="time"
                  {...register("start_time")}
                  aria-invalid={!!errors.start_time}
                />
                <FieldError message={errors.start_time?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_time">Hora fin *</Label>
                <Input
                  id="end_time"
                  type="time"
                  {...register("end_time")}
                  aria-invalid={!!errors.end_time}
                />
                <FieldError message={errors.end_time?.message} />
              </div>
            </div>
          </div>

          {conflicts.length > 0 && (
            <div className="rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 dark:border-yellow-700 dark:bg-yellow-950/30">
              <div className="flex items-center gap-2 text-sm font-medium text-yellow-800 dark:text-yellow-300">
                <AlertTriangle className="size-4" />
                Conflicto de horario detectado
              </div>
              <ul className="mt-2 space-y-1">
                {conflicts.map((c) => (
                  <li key={c.id} className="text-sm text-yellow-700 dark:text-yellow-400">
                    {vetDisplayName} ya tiene una cita de {formatTime(c.start_time)} a{" "}
                    {formatTime(c.end_time)} con {c.pet.name}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {checkingConflicts && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" />
              Verificando disponibilidad...
            </div>
          )}

          {watchedVetId && watchedDate && (
            <div className="rounded-lg border px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Clock className="size-4" />
                Agenda de {vetDisplayName} el{" "}
                {watchedDate}
              </div>
              {loadingVetDay ? (
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" />
                  Cargando...
                </div>
              ) : vetDayAppointments.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Sin citas agendadas para este dia.
                </p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {vetDayAppointments.map((a) => (
                    <li
                      key={a.id}
                      className="text-xs text-muted-foreground"
                    >
                      {formatTime(a.start_time)} - {formatTime(a.end_time)}: {a.pet.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">Motivo de consulta</Label>
            <Textarea
              id="reason"
              placeholder="Describe brevemente el motivo de la visita..."
              {...register("reason")}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas internas</Label>
            <Textarea
              id="notes"
              placeholder="Notas adicionales (solo visibles para el equipo)..."
              {...register("notes")}
              rows={2}
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
              {isEditing ? "Guardar cambios" : "Agendar cita"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/${clinicSlug}/appointments`)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
