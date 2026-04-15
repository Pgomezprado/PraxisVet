"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { acceptInvitationSchema } from "@/lib/validations/team-members";
import { acceptInvitationAction } from "@/app/accept-invite/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2 } from "lucide-react";
import type { z } from "zod";

type FormValues = z.input<typeof acceptInvitationSchema>;

export function AcceptInviteForm({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(acceptInvitationSchema),
    defaultValues: { token, password: "", confirm: "" },
  });

  function onSubmit(values: FormValues) {
    setError(null);
    startTransition(async () => {
      const res = await acceptInvitationAction(values);
      if (!res.success) {
        setError(res.error);
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/auth/login"), 2000);
    });
  }

  if (done) {
    return (
      <div className="rounded-lg border border-primary/40 bg-primary/5 p-4 text-center">
        <CheckCircle2 className="mx-auto mb-2 size-8 text-primary" />
        <p className="text-sm font-medium">¡Cuenta activada!</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Redirigiéndote al inicio de sesión…
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <input type="hidden" {...register("token")} />

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div>
        <Label htmlFor="password">Contraseña *</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          {...register("password")}
          aria-invalid={!!errors.password}
        />
        {errors.password && (
          <p className="mt-1 text-xs text-destructive">
            {errors.password.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="confirm">Confirmar contraseña *</Label>
        <Input
          id="confirm"
          type="password"
          autoComplete="new-password"
          {...register("confirm")}
          aria-invalid={!!errors.confirm}
        />
        {errors.confirm && (
          <p className="mt-1 text-xs text-destructive">
            {errors.confirm.message}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending && <Loader2 className="mr-2 size-3.5 animate-spin" />}
        Activar mi cuenta
      </Button>
    </form>
  );
}
