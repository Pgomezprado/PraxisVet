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

export function RegisterForm() {
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
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      const errorMessages: Record<string, string> = {
        "User already registered": "Este email ya est\u00e1 registrado",
        "Password should be at least 6 characters":
          "La contrase\u00f1a debe tener al menos 6 caracteres",
        "Invalid email": "Email inv\u00e1lido",
        "Signup requires a valid password":
          "Debes ingresar una contrase\u00f1a v\u00e1lida",
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
          <CardTitle className="text-2xl">Revisa tu email</CardTitle>
          <CardDescription>
            Te enviamos un enlace de confirmaci\u00f3n. Revisa tu bandeja de entrada
            para activar tu cuenta.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Crear cuenta</CardTitle>
        <CardDescription>
          Reg\u00edstrate para empezar a gestionar tu cl\u00ednica
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
            <Label htmlFor="password">Contrase\u00f1a</Label>
            <Input
              id="password"
              type="password"
              placeholder="M\u00ednimo 8 caracteres"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-sm text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar contrase\u00f1a</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Repite tu contrase\u00f1a"
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{" "}
            <Link
              href="/auth/login"
              className="font-medium text-primary hover:underline"
            >
              Iniciar sesi\u00f3n
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
