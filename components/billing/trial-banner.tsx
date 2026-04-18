import Link from "next/link";
import { differenceInCalendarDays } from "date-fns";
import { Clock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { TRIAL_WARNING_THRESHOLD_DAYS } from "@/lib/billing/constants";
import type { SubscriptionStatus } from "@/types";

type Props = {
  trialEndsAt: string | null;
  subscriptionStatus: SubscriptionStatus;
};

export function TrialBanner({ trialEndsAt, subscriptionStatus }: Props) {
  if (subscriptionStatus !== "trial" || !trialEndsAt) return null;

  const daysLeft = differenceInCalendarDays(new Date(trialEndsAt), new Date());

  if (daysLeft > TRIAL_WARNING_THRESHOLD_DAYS || daysLeft < 0) return null;

  const urgent = daysLeft <= 7;

  return (
    <div
      className={cn(
        "flex flex-col items-start gap-2 border-b px-6 py-3 text-sm sm:flex-row sm:items-center sm:justify-between",
        urgent
          ? "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200"
          : "border-primary/20 bg-primary/5 text-foreground"
      )}
    >
      <div className="flex items-center gap-2">
        {urgent ? (
          <Clock className="size-4 shrink-0 text-amber-500" />
        ) : (
          <Sparkles className="size-4 shrink-0 text-primary" />
        )}
        <span>
          {daysLeft === 0 ? (
            <>
              <strong>Tu prueba termina hoy.</strong> Activa tu plan para no
              perder acceso.
            </>
          ) : daysLeft === 1 ? (
            <>
              <strong>Queda 1 día</strong> de prueba. Activa tu plan para no
              perder acceso.
            </>
          ) : urgent ? (
            <>
              <strong>Quedan {daysLeft} días</strong> de prueba. Activa tu
              plan para no perder acceso.
            </>
          ) : (
            <>
              Te quedan <strong>{daysLeft} días</strong> de prueba gratis de
              PraxisVet.
            </>
          )}
        </span>
      </div>
      <Link
        href="/billing/upgrade"
        className={cn(
          "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
          urgent
            ? "bg-amber-500 text-white hover:bg-amber-600"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        )}
      >
        {urgent ? "Activar mi plan" : "Ver planes"}
      </Link>
    </div>
  );
}
