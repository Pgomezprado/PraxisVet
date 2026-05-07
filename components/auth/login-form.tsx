"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
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

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.signOut().catch(() => {});
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginInput) {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      setError("Email o contraseña incorrectos");
      setLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Platform admins van directo al panel global, sin pasar por una clínica.
    // Importante chequear esto ANTES de organization_members: las policies
    // elevadas hacen que un platform admin vea filas de TODAS las orgs.
    const { data: platformAdmin } = await supabase
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", user?.id ?? "")
      .is("revoked_at", null)
      .maybeSingle();

    if (platformAdmin) {
      router.push("/superadmin");
      return;
    }

    const { data: membership } = await supabase
      .from("organization_members")
      .select("organizations ( slug )")
      .eq("user_id", user?.id ?? "")
      .limit(1)
      .maybeSingle();

    const org = membership?.organizations as unknown as { slug: string } | null;

    if (org?.slug) {
      router.push(`/${org.slug}/dashboard`);
      return;
    }

    // Tutor del portal: tiene vínculo activo a una o más clínicas.
    const { data: tutorLinks } = await supabase
      .from("client_auth_links")
      .select("organizations!inner(slug)")
      .eq("active", true)
      .not("linked_at", "is", null);

    const clinics = ((tutorLinks ?? []) as unknown as Array<{
      organizations: { slug: string };
    }>).map((l) => l.organizations.slug);

    if (clinics.length === 1) {
      router.push(`/tutor/${clinics[0]}`);
      return;
    }
    if (clinics.length > 1) {
      router.push("/tutor");
      return;
    }

    router.push("/onboarding");
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Iniciar sesión</CardTitle>
        <CardDescription>
          Ingresa tus credenciales para acceder a tu clínica
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
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Contraseña</Label>
              <Link
                href="/auth/forgot-password"
                className="text-sm text-muted-foreground hover:text-foreground hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-sm text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Ingresando..." : "Iniciar sesión"}
          </Button>

          <div className="space-y-1.5 text-center text-sm text-muted-foreground">
            <p>
              ¿Tienes una clínica?{" "}
              <Link
                href="/auth/register"
                className="font-medium text-primary hover:underline"
              >
                Regístrala aquí
              </Link>
            </p>
            <p className="text-xs">
              ¿Eres dueño/a de mascota?{" "}
              <Link
                href="/auth/registro-tutor"
                className="font-medium text-primary hover:underline"
              >
                Crea tu cuenta de tutor
              </Link>
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
