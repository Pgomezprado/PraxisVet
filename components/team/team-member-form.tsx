"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  teamMemberSchema,
  type TeamMemberInput,
  memberRoles,
  roleLabels,
  roleDescriptions,
} from "@/lib/validations/team-members";
import { useClinic } from "@/lib/context/clinic-context";
import {
  createTeamMember,
  updateTeamMember,
  inviteExistingMember,
  updateMemberCapabilities,
} from "@/app/[clinic]/settings/team/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Loader2, UserCog, Stethoscope, Users, Scissors, Shield } from "lucide-react";
import type {
  OrganizationMember,
  MemberRole,
  MemberCapability,
} from "@/types";

const roleIcons: Record<MemberRole, typeof Shield> = {
  admin: Shield,
  vet: Stethoscope,
  receptionist: Users,
  groomer: Scissors,
};

interface TeamMemberFormProps {
  member?: OrganizationMember;
  initialCapabilities?: MemberCapability[];
}

// Roles que ya cubren implícitamente una capability (mismo criterio que
// lib/auth/capabilities.ts ROLE_COVERS_CAPABILITY).
function roleCoversCapability(
  role: MemberRole,
  capability: MemberCapability
): boolean {
  if (role === "admin") return true;
  if (capability === "can_vet") return role === "vet";
  if (capability === "can_groom") return role === "groomer";
  return false;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-destructive">{message}</p>;
}

export function TeamMemberForm({
  member,
  initialCapabilities = [],
}: TeamMemberFormProps) {
  const router = useRouter();
  const { organization, clinicSlug } = useClinic();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [canVetExtra, setCanVetExtra] = useState(
    initialCapabilities.includes("can_vet")
  );
  const [canGroomExtra, setCanGroomExtra] = useState(
    initialCapabilities.includes("can_groom")
  );

  const isEditing = !!member;
  const canInvite = !member?.user_id;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TeamMemberInput>({
    resolver: zodResolver(teamMemberSchema),
    defaultValues: {
      first_name: member?.first_name ?? "",
      last_name: member?.last_name ?? "",
      role: member?.role ?? "vet",
      specialty: member?.specialty ?? "",
      email: "",
    },
  });

  const selectedRole = watch("role");

  async function onSubmit(data: TeamMemberInput) {
    setError(null);
    setLoading(true);

    const result = isEditing
      ? await updateTeamMember(member.id, clinicSlug, data)
      : await createTeamMember(organization.id, clinicSlug, data);

    if (!result.success) {
      setLoading(false);
      setError(result.error);
      return;
    }

    const memberId = isEditing ? member.id : result.data.id;
    const capsResult = await updateMemberCapabilities(memberId, clinicSlug, {
      can_vet: canVetExtra,
      can_groom: canGroomExtra,
    });
    if (!capsResult.success) {
      setLoading(false);
      setError(
        `Datos guardados, pero falló actualizar capacidades: ${capsResult.error}`
      );
      return;
    }

    const email = data.email?.trim();
    if (isEditing && canInvite && email) {
      const inviteRes = await inviteExistingMember(
        member.id,
        clinicSlug,
        email
      );
      if (!inviteRes.success) {
        setLoading(false);
        setError(`Datos guardados, pero falló el envío: ${inviteRes.error}`);
        return;
      }
    }

    setLoading(false);
    router.push(`/${clinicSlug}/settings/team`);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
            <UserCog className="size-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">
              {isEditing ? "Editar miembro" : "Nuevo miembro"}
            </CardTitle>
            <CardDescription>
              {isEditing
                ? "Actualiza los datos del miembro del equipo."
                : "Agrega un veterinario, recepcionista o peluquero a tu clínica."}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="first_name">Nombre *</Label>
              <Input
                id="first_name"
                placeholder="Ej: Sofía"
                {...register("first_name")}
                aria-invalid={!!errors.first_name}
              />
              <FieldError message={errors.first_name?.message} />
            </div>

            <div>
              <Label htmlFor="last_name">Apellido</Label>
              <Input
                id="last_name"
                placeholder="Ej: Morales"
                {...register("last_name")}
              />
            </div>
          </div>

          <div>
            <Label>Rol *</Label>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {memberRoles.map((role) => {
                const Icon = roleIcons[role];
                const isSelected = selectedRole === role;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() =>
                      setValue("role", role, { shouldValidate: true })
                    }
                    className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    }`}
                  >
                    <div
                      className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-medium ${
                          isSelected ? "text-primary" : ""
                        }`}
                      >
                        {roleLabels[role]}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {roleDescriptions[role]}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
            <FieldError message={errors.role?.message} />
          </div>

          <div className="space-y-2">
            <Label>Capacidades adicionales</Label>
            <p className="text-xs text-muted-foreground">
              Marca si este miembro también puede atender el otro tipo de
              servicio además de su rol principal.
            </p>
            <div className="space-y-2">
              {(() => {
                const vetCovered = roleCoversCapability(selectedRole, "can_vet");
                return (
                  <label className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/50">
                    <input
                      type="checkbox"
                      className="mt-1 size-4 rounded border-border"
                      checked={vetCovered || canVetExtra}
                      disabled={vetCovered}
                      onChange={(e) => setCanVetExtra(e.target.checked)}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        Puede atender consultas médicas
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {vetCovered
                          ? "Incluido en el rol seleccionado."
                          : "Permite asignar citas médicas a este miembro."}
                      </p>
                    </div>
                  </label>
                );
              })()}
              {(() => {
                const groomCovered = roleCoversCapability(
                  selectedRole,
                  "can_groom"
                );
                return (
                  <label className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/50">
                    <input
                      type="checkbox"
                      className="mt-1 size-4 rounded border-border"
                      checked={groomCovered || canGroomExtra}
                      disabled={groomCovered}
                      onChange={(e) => setCanGroomExtra(e.target.checked)}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        Puede atender peluquería
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {groomCovered
                          ? "Incluido en el rol seleccionado."
                          : "Permite asignar citas de peluquería a este miembro."}
                      </p>
                    </div>
                  </label>
                );
              })()}
            </div>
          </div>

          <div>
            <Label htmlFor="specialty">
              Especialidad{" "}
              <span className="text-xs font-normal text-muted-foreground">
                (opcional)
              </span>
            </Label>
            <Input
              id="specialty"
              placeholder="Ej: Medicina felina, Cirugía menor, Peluquería canina"
              {...register("specialty")}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Aparece junto al nombre al asignar citas.
            </p>
          </div>

          {(!isEditing || canInvite) && (
            <div>
              <Label htmlFor="email">
                Email{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  {isEditing
                    ? "(para enviar invitación de acceso)"
                    : "(opcional — para enviar invitación)"}
                </span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Ej: sofia@clinica.cl"
                {...register("email")}
                aria-invalid={!!errors.email}
              />
              <FieldError message={errors.email?.message} />
              <p className="mt-1 text-xs text-muted-foreground">
                {isEditing
                  ? "Este miembro aún no tiene acceso al sistema. Ingresa un email para enviarle la invitación."
                  : "Si lo dejas vacío, el miembro se crea como perfil sin acceso al sistema. Podrás invitarlo más tarde."}
              </p>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="size-3.5 animate-spin" />}
              {isEditing
                ? canInvite && watch("email")
                  ? "Guardar y enviar invitación"
                  : "Guardar cambios"
                : watch("email")
                ? "Crear y enviar invitación"
                : "Crear miembro"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancelar
            </Button>
          </div>

          {!isEditing && (
            <p className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              💡 Con email → se envía una invitación y el miembro podrá iniciar
              sesión tras crear su contraseña. Sin email → perfil para asignar
              citas, sin acceso al sistema.
            </p>
          )}
          {isEditing && canInvite && (
            <p className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              💡 Este miembro fue creado sin acceso. Ingresa su email y al
              guardar se enviará la invitación para que cree su contraseña.
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
