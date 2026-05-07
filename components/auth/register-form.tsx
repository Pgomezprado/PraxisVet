"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";
import { createClient } from "@/lib/supabase/client";
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

type RegisterMode = "clinic" | "tutor";

const COPY: Record<
  RegisterMode,
  {
    title: string;
    description: string;
    cta: string;
    successTitle: string;
    successDescription: string;
    nextPath: string;
    crossLinkLabel: string;
    crossLinkText: string;
    crossLinkHref: string;
  }
> = {
  clinic: {
    title: "Crear cuenta de clínica",
    description: "Regístrate para empezar a gestionar tu clínica veterinaria.",
    cta: "Crear cuenta de clínica",
    successTitle: "Revisa tu email",
    successDescription:
      "Te enviamos un enlace para activar tu cuenta y empezar a configurar tu clínica.",
    nextPath: "/onboarding",
    crossLinkLabel: "¿Eres dueño/a de mascota?",
    crossLinkText: "Crea tu cuenta de tutor",
    crossLinkHref: "/auth/registro-tutor",
  },
  tutor: {
    title: "Crear cuenta de tutor",
    description:
      "Regístrate para empezar a guardar todo lo de tu mascota en un solo lugar.",
    cta: "Crear mi cuenta",
    successTitle: "Revisa tu email",
    successDescription:
      "Te enviamos un enlace para activar tu cuenta. Apenas confirmes, podrás registrar a tu regalón.",
    nextPath: "/mascotas",
    crossLinkLabel: "¿Tienes una clínica veterinaria?",
    crossLinkText: "Regístrala aquí",
    crossLinkHref: "/auth/register",
  },
};

export function RegisterForm({ mode = "clinic" }: { mode?: RegisterMode } = {}) {
  const copy = COPY[mode];
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  async function onSubmit(data: RegisterInput) {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(copy.nextPath)}`,
      },
    });

    if (error) {
      const errorMessages: Record<string, string> = {
        "User already registered": "Este email ya está registrado",
        "Password should be at least 6 characters":
          "La contraseña debe tener al menos 6 caracteres",
        "Invalid email": "Email inválido",
        "Signup requires a valid password":
          "Debes ingresar una contraseña válida",
      };
      setError(
        errorMessages[error.message] ??
          "Error al crear la cuenta. Intenta de nuevo."
      );
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{copy.successTitle}</CardTitle>
          <CardDescription>{copy.successDescription}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{copy.title}</CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@email.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              placeholder="Mínimo 8 caracteres"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-sm text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Repite tu contraseña"
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creando cuenta..." : copy.cta}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{" "}
            <Link
              href="/auth/login"
              className="font-medium text-primary hover:underline"
            >
              Iniciar sesión
            </Link>
          </p>
          <p className="text-center text-xs text-muted-foreground">
            {copy.crossLinkLabel}{" "}
            <Link
              href={copy.crossLinkHref}
              className="font-medium text-primary hover:underline"
            >
              {copy.crossLinkText}
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
