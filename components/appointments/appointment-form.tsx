"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { appointmentSchema, type AppointmentInput } from "@/lib/validations/appointments";
import { createAppointment, updateAppointment } from "@/app/[clinic]/appointments/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

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
              onClick={() => router.back()}
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
