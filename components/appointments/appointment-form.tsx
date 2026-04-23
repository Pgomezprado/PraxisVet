"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { appointmentSchema, type AppointmentInput } from "@/lib/validations/appointments";
import {
  createAppointment,
  updateAppointment,
  checkConflicts,
  getProfessionalDayAppointments,
  getMemberDayAvailability,
  getMemberWeeklySchedule,
  getProfessionals,
} from "@/app/[clinic]/appointments/actions";
import type { AppointmentWithRelations } from "@/app/[clinic]/appointments/actions";
import type { MemberRole } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Select } from "@/components/ui/select";
import { TimePicker } from "@/components/ui/time-picker";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CalendarDays, Clock, Loader2 } from "lucide-react";
import { formatCLP } from "@/lib/utils/format";
import { formatSpecies } from "@/lib/validations/clients";

type ClientWithPets = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  pets: { id: string; name: string; species: string | null; breed: string | null; active: boolean }[];
};

type Professional = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  specialty: string | null;
  role: MemberRole;
};

type ServiceOption = {
  id: string;
  name: string;
  duration_minutes: number;
  price: number | null;
  category: string | null;
};

type ProfessionalDayAppointment = {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  type: string;
  pet: { id: string; name: string };
};

interface AppointmentFormProps {
  orgId: string;
  clinicSlug: string;
  clients: ClientWithPets[];
  professionals: Professional[];
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
  professionals,
  services,
  defaultValues,
  appointmentId,
}: AppointmentFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<AppointmentWithRelations[]>([]);
  const [checkingConflicts, setCheckingConflicts] = useState(false);
  const [dayAppointments, setDayAppointments] = useState<ProfessionalDayAppointment[]>([]);
  const [loadingDay, setLoadingDay] = useState(false);
  const [dayAvailability, setDayAvailability] = useState<{
    tramos: { start_time: string; end_time: string }[];
    blocks: { start_date: string; end_date: string; reason: string | null }[];
  } | null>(null);
  const [weeklySchedule, setWeeklySchedule] = useState<
    { day_of_week: number; start_time: string; end_time: string }[] | null
  >(null);
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
      assigned_to: "",
      type: "medical",
      service_id: "",
      date: new Date().toISOString().split("T")[0],
      start_time: "",
      end_time: "",
      reason: "",
      notes: "",
      is_dangerous: false,
      ...defaultValues,
    },
  });

  const selectedClientId = watch("client_id");
  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const availablePets = selectedClient?.pets ?? [];

  const watchedType = watch("type");
  const watchedAssignedTo = watch("assigned_to");
  const watchedDate = watch("date");
  const watchedStartTime = watch("start_time");
  const watchedEndTime = watch("end_time");

  // Lista de profesionales filtrada por tipo de cita. Inicialmente filtra por
  // rol base (fallback sincrónico). En cada cambio de tipo, refresca desde el
  // servidor que respeta también las capabilities explícitas (un vet con
  // can_groom debe aparecer al elegir grooming).
  const [capabilityProfessionals, setCapabilityProfessionals] = useState<
    Professional[] | null
  >(null);

  const filteredProfessionals = useMemo(() => {
    if (capabilityProfessionals) return capabilityProfessionals;
    if (watchedType === "grooming") {
      return professionals.filter((p) => p.role === "groomer" || p.role === "admin");
    }
    return professionals.filter((p) => p.role === "vet" || p.role === "admin");
  }, [capabilityProfessionals, professionals, watchedType]);

  useEffect(() => {
    let cancelled = false;
    setCapabilityProfessionals(null);
    getProfessionals(orgId, watchedType).then((res) => {
      if (cancelled) return;
      if (!res.error && res.data) {
        setCapabilityProfessionals(res.data as Professional[]);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [orgId, watchedType]);

  const filteredServices = useMemo(() => {
    if (watchedType === "grooming") {
      return services.filter((s) => s.category === "grooming");
    }
    return services.filter((s) => s.category !== "grooming");
  }, [services, watchedType]);

  useEffect(() => {
    if (!watchedAssignedTo) return;
    const stillValid = filteredProfessionals.some((p) => p.id === watchedAssignedTo);
    if (!stillValid) {
      setValue("assigned_to", "");
    }
  }, [filteredProfessionals, watchedAssignedTo, setValue]);

  useEffect(() => {
    const currentService = watch("service_id");
    if (!currentService) return;
    const stillValid = filteredServices.some((s) => s.id === currentService);
    if (!stillValid) {
      setValue("service_id", "");
    }
  }, [filteredServices, setValue, watch]);

  const selectedProfessional = filteredProfessionals.find((p) => p.id === watchedAssignedTo);
  const professionalDisplayName = selectedProfessional
    ? [selectedProfessional.first_name, selectedProfessional.last_name].filter(Boolean).join(" ")
    : "";

  const doCheckConflicts = useCallback(async () => {
    if (!watchedAssignedTo || !watchedDate || !watchedStartTime || !watchedEndTime) {
      setConflicts([]);
      return;
    }
    if (watchedEndTime <= watchedStartTime) {
      setConflicts([]);
      return;
    }

    setCheckingConflicts(true);
    const result = await checkConflicts(orgId, {
      assigned_to: watchedAssignedTo,
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
  }, [watchedAssignedTo, watchedDate, watchedStartTime, watchedEndTime, orgId, appointmentId]);

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
    if (!watchedAssignedTo || !watchedDate) {
      setDayAppointments([]);
      return;
    }

    let cancelled = false;
    setLoadingDay(true);

    getProfessionalDayAppointments(orgId, watchedAssignedTo, watchedDate).then((result) => {
      if (cancelled) return;
      setLoadingDay(false);
      if (!result.error && result.data) {
        const mapped: ProfessionalDayAppointment[] = (
          result.data as unknown as ProfessionalDayAppointment[]
        ).filter((a) => !appointmentId || a.id !== appointmentId);
        setDayAppointments(mapped);
      } else {
        setDayAppointments([]);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [watchedAssignedTo, watchedDate, orgId, appointmentId]);

  useEffect(() => {
    if (!watchedAssignedTo || !watchedDate) {
      setDayAvailability(null);
      return;
    }
    let cancelled = false;
    getMemberDayAvailability(watchedAssignedTo, watchedDate).then((res) => {
      if (!cancelled) setDayAvailability(res);
    });
    return () => {
      cancelled = true;
    };
  }, [watchedAssignedTo, watchedDate]);

  useEffect(() => {
    if (!watchedAssignedTo) {
      setWeeklySchedule(null);
      return;
    }
    let cancelled = false;
    getMemberWeeklySchedule(watchedAssignedTo).then((res) => {
      if (!cancelled) setWeeklySchedule(res);
    });
    return () => {
      cancelled = true;
    };
  }, [watchedAssignedTo]);

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

  const computeEndTime = useCallback(
    (startTime: string, durationMinutes: number): string => {
      const [hours, minutes] = startTime.split(":").map(Number);
      if (Number.isNaN(hours) || Number.isNaN(minutes)) return "";
      const endDate = new Date(2000, 0, 1, hours, minutes + durationMinutes);
      return `${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}`;
    },
    []
  );

  function handleServiceChange(serviceId: string) {
    setValue("service_id", serviceId);

    if (!serviceId) return;

    const service = filteredServices.find((s) => s.id === serviceId);
    if (service && watch("start_time")) {
      setValue("end_time", computeEndTime(watch("start_time"), service.duration_minutes), {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  }

  function handleStartTimeChange(value: string) {
    setValue("start_time", value, {
      shouldValidate: true,
      shouldDirty: true,
    });

    const currentServiceId = watch("service_id");
    if (!currentServiceId || !value) return;

    const service = filteredServices.find((s) => s.id === currentServiceId);
    if (service) {
      setValue("end_time", computeEndTime(value, service.duration_minutes), {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  }

  function handleClientChange(clientId: string) {
    setValue("client_id", clientId);
    setValue("pet_id", "");
  }

  const professionalLabel = watchedType === "grooming" ? "Peluquero" : "Veterinario";

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

          <div className="space-y-2">
            <Label htmlFor="type">Tipo de cita *</Label>
            <Select id="type" {...register("type")} aria-invalid={!!errors.type}>
              <option value="medical">Consulta médica</option>
              <option value="grooming">Peluquería</option>
            </Select>
            <FieldError message={errors.type?.message} />
          </div>

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
                    {pet.species ? ` (${formatSpecies(pet.species)})` : ""}
                  </option>
                ))}
              </Select>
              <FieldError message={errors.pet_id?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="assigned_to">{professionalLabel} *</Label>
              <Select
                id="assigned_to"
                {...register("assigned_to")}
                aria-invalid={!!errors.assigned_to}
              >
                <option value="">Seleccionar {professionalLabel.toLowerCase()}</option>
                {filteredProfessionals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {[p.first_name, p.last_name].filter(Boolean).join(" ")}
                    {p.specialty ? ` - ${p.specialty}` : ""}
                  </option>
                ))}
              </Select>
              <FieldError message={errors.assigned_to?.message} />
            </div>

            {watchedAssignedTo && weeklySchedule && (
              <div className="sm:col-span-2 rounded-lg border bg-muted/30 px-4 py-3 text-sm">
                <div className="flex items-center gap-2 font-medium">
                  <CalendarDays className="size-4 text-primary" />
                  Horario de {professionalDisplayName || professionalLabel.toLowerCase()}
                </div>
                {weeklySchedule.length === 0 ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Este profesional no tiene horario configurado. Pídele a un
                    administrador que lo configure en Ajustes → Equipo.
                  </p>
                ) : (
                  <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
                    {[1, 2, 3, 4, 5, 6, 0].map((dow) => {
                      const tramos = weeklySchedule.filter(
                        (s) => s.day_of_week === dow
                      );
                      const dayLabel = [
                        "Dom",
                        "Lun",
                        "Mar",
                        "Mié",
                        "Jue",
                        "Vie",
                        "Sáb",
                      ][dow];
                      return (
                        <li
                          key={dow}
                          className={`text-xs ${
                            tramos.length === 0
                              ? "text-muted-foreground/50"
                              : "text-foreground"
                          }`}
                        >
                          <span className="font-semibold">{dayLabel}:</span>{" "}
                          {tramos.length === 0
                            ? "no atiende"
                            : tramos
                                .map(
                                  (t) =>
                                    `${t.start_time.slice(0, 5)}–${t.end_time.slice(0, 5)}`
                                )
                                .join(", ")}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="service_id">Servicio</Label>
              <Select
                id="service_id"
                {...register("service_id")}
                onChange={(e) => handleServiceChange(e.target.value)}
              >
                <option value="">Sin servicio</option>
                {filteredServices.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                    {service.price != null ? ` - ${formatCLP(service.price)}` : ""}
                    {` (${service.duration_minutes} min)`}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Fecha *</Label>
              <DatePicker
                id="date"
                value={watch("date")}
                onChange={(v) =>
                  setValue("date", v, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                aria-invalid={!!errors.date}
              />
              <FieldError message={errors.date?.message} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="start_time">Hora inicio *</Label>
                <TimePicker
                  id="start_time"
                  value={watch("start_time")}
                  onChange={handleStartTimeChange}
                  aria-invalid={!!errors.start_time}
                />
                <FieldError message={errors.start_time?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_time">Hora fin *</Label>
                <TimePicker
                  id="end_time"
                  value={watch("end_time")}
                  onChange={(v) =>
                    setValue("end_time", v, {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
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
                    {professionalDisplayName} ya tiene una cita de {formatTime(c.start_time)} a{" "}
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

          {watchedAssignedTo && watchedDate && dayAvailability && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-sm space-y-1">
              {dayAvailability.tramos.length === 0 ? (
                <p className="text-amber-700 dark:text-amber-400">
                  ⚠️ Este profesional no atiende ese día. La cita será
                  rechazada.
                </p>
              ) : (
                <p className="text-muted-foreground">
                  <strong>Atiende ese día:</strong>{" "}
                  {dayAvailability.tramos
                    .map(
                      (t) =>
                        `${t.start_time.slice(0, 5)}-${t.end_time.slice(0, 5)}`
                    )
                    .join(", ")}
                </p>
              )}
              {dayAvailability.blocks.length > 0 && (
                <p className="text-destructive">
                  🚫 Bloqueado:{" "}
                  {dayAvailability.blocks[0].reason || "sin motivo"}
                </p>
              )}
            </div>
          )}

          {watchedAssignedTo && watchedDate && (
            <div className="rounded-lg border px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Clock className="size-4" />
                Agenda de {professionalDisplayName} el {watchedDate}
              </div>
              {loadingDay ? (
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" />
                  Cargando...
                </div>
              ) : dayAppointments.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Sin citas agendadas para este dia.
                </p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {dayAppointments.map((a) => (
                    <li key={a.id} className="text-xs text-muted-foreground">
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

          {watchedType === "grooming" && (
            <div className="flex items-start justify-between gap-4 rounded-lg border border-red-300 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/30">
              <div className="space-y-1">
                <Label
                  htmlFor="is_dangerous"
                  className="flex items-center gap-2 text-red-900 dark:text-red-200"
                >
                  <AlertTriangle className="size-4 text-red-600" />
                  Animal peligroso o agresivo
                </Label>
                <p className="text-xs text-red-800/80 dark:text-red-300/80">
                  Marca esta opción si el animal requiere manejo especial
                  (bozal, sedación previa, apoyo). El peluquero verá una
                  alerta destacada en su agenda.
                </p>
              </div>
              <Switch
                id="is_dangerous"
                checked={watch("is_dangerous") ?? false}
                onCheckedChange={(value) => setValue("is_dangerous", value)}
              />
            </div>
          )}

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
