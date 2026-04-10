"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  onboardingSchema,
  type OnboardingInput,
} from "@/lib/validations/onboarding";
import {
  createOrganization,
  checkSlugAvailability,
} from "@/app/onboarding/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

function generateSlug(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function OnboardingForm() {
  const [error, setError] = useState<string | null>(null);
  const [slugStatus, setSlugStatus] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      clinicName: "",
      slug: "",
      phone: "",
      address: "",
      firstName: "",
      lastName: "",
    },
  });

  const slug = watch("slug");

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const name = e.target.value;
    const newSlug = generateSlug(name);
    setValue("slug", newSlug, { shouldValidate: true });
    if (newSlug.length >= 3) {
      checkSlug(newSlug);
    }
  }

  async function checkSlug(value: string) {
    setSlugStatus("checking");
    const result = await checkSlugAvailability(value);
    setSlugStatus(result.available ? "available" : "taken");
  }

  async function onSubmit(data: OnboardingInput) {
    setLoading(true);
    setError(null);

    const result = await createOrganization(data);

    if (result && !result.success) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Configura tu clinica</CardTitle>
        <CardDescription>
          Completa los datos de tu clinica para empezar a usar PraxisVet
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="clinicName">Nombre de la clinica</Label>
            <Input
              id="clinicName"
              placeholder="ej: Veterinaria El Roble"
              {...register("clinicName", {
                onChange: handleNameChange,
              })}
            />
            {errors.clinicName && (
              <p className="text-sm text-destructive">
                {errors.clinicName.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">URL de tu clinica</Label>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <span>praxisvet.com/</span>
              <Input
                id="slug"
                placeholder="mi-clinica"
                className="flex-1"
                {...register("slug", {
                  onChange: (e) => {
                    if (e.target.value.length >= 3) {
                      checkSlug(e.target.value);
                    }
                  },
                })}
              />
            </div>
            {errors.slug && (
              <p className="text-sm text-destructive">{errors.slug.message}</p>
            )}
            {slugStatus === "checking" && (
              <p className="text-sm text-muted-foreground">Verificando...</p>
            )}
            {slugStatus === "available" && (
              <p className="text-sm text-green-600">Disponible</p>
            )}
            {slugStatus === "taken" && (
              <p className="text-sm text-destructive">
                Este slug ya esta en uso
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefono (opcional)</Label>
              <Input
                id="phone"
                placeholder="ej: +52 55 1234 5678"
                {...register("phone")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Direccion (opcional)</Label>
              <Input
                id="address"
                placeholder="ej: Av. Principal 123"
                {...register("address")}
              />
            </div>
          </div>

          <Separator />

          <p className="text-sm font-medium text-foreground">
            Tus datos como administrador
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">Nombre</Label>
              <Input
                id="firstName"
                placeholder="ej: Pablo"
                {...register("firstName")}
              />
              {errors.firstName && (
                <p className="text-sm text-destructive">
                  {errors.firstName.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Apellido</Label>
              <Input
                id="lastName"
                placeholder="ej: Gomez"
                {...register("lastName")}
              />
              {errors.lastName && (
                <p className="text-sm text-destructive">
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading || slugStatus === "taken"}
          >
            {loading ? "Creando clinica..." : "Crear clinica"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
