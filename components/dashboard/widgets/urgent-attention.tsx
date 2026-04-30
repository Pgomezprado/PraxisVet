import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertTriangle,
  Package,
  CheckCircle2,
  Clock,
  ArrowRight,
} from "lucide-react";
import type { UrgentAttention } from "@/app/[clinic]/dashboard/queries";

export function UrgentAttentionWidget({
  data,
  clinicSlug,
}: {
  data: UrgentAttention;
  clinicSlug: string;
}) {
  const items: Array<{
    icon: typeof AlertTriangle;
    label: string;
    value: string;
    href: string;
    tone: "red" | "amber" | "sky";
  }> = [];

  if (data.lowStock.count > 0) {
    items.push({
      icon: Package,
      label: `${data.lowStock.count} producto${
        data.lowStock.count > 1 ? "s" : ""
      } con stock bajo`,
      value: "Revisar",
      href: `/${clinicSlug}/inventory`,
      tone: "amber",
    });
  }

  if (data.unconfirmedAppointments.count > 0) {
    items.push({
      icon: Clock,
      label: `${data.unconfirmedAppointments.count} cita${
        data.unconfirmedAppointments.count > 1 ? "s" : ""
      } sin confirmar`,
      value: "Confirmar",
      href: `/${clinicSlug}/appointments`,
      tone: "sky",
    });
  }

  const allClear = items.length === 0;

  const toneClasses = {
    red: {
      bg: "bg-rose-500/10",
      text: "text-rose-600 dark:text-rose-400",
      border: "border-rose-500/30",
    },
    amber: {
      bg: "bg-orange-500/10",
      text: "text-orange-600 dark:text-orange-400",
      border: "border-orange-500/30",
    },
    sky: {
      bg: "bg-sky-500/10",
      text: "text-sky-600 dark:text-sky-400",
      border: "border-sky-500/30",
    },
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-5 text-orange-600 dark:text-orange-400" />
          <CardTitle className="text-base font-semibold">
            Atención urgente
          </CardTitle>
        </div>
        <CardDescription>
          {allClear
            ? "Todo en orden por ahora"
            : "Cosas que necesitan tu atención hoy"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {allClear ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-primary/30 bg-primary/5 py-8 text-center">
            <CheckCircle2 className="mb-2 size-8 text-primary" />
            <p className="text-sm font-medium">Sin pendientes urgentes</p>
            <p className="mt-1 text-xs text-muted-foreground">
              No hay stock bajo ni citas sin confirmar.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => {
              const styles = toneClasses[item.tone];
              return (
                <li key={item.href + item.label}>
                  <Link
                    href={item.href}
                    className={`group flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50 ${styles.border}`}
                  >
                    <div
                      className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${styles.bg}`}
                    >
                      <item.icon className={`size-4 ${styles.text}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {item.label}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold ${styles.text}`}>
                      {item.value}
                    </span>
                    <ArrowRight className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
