import { Syringe, Bug, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ReminderType } from "@/types";

interface UpcomingRemindersCardProps {
  petId: string;
  windowDays?: number;
}

interface ReminderRow {
  id: string;
  type: ReminderType;
  source_table: string | null;
  source_id: string | null;
  due_date: string;
}

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function diffInDays(iso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(iso + "T00:00:00");
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function UrgencyBadge({ days }: { days: number }) {
  if (days < 0) {
    return <Badge variant="destructive">Vencida hace {Math.abs(days)}d</Badge>;
  }
  if (days < 7) {
    return <Badge variant="destructive">en {days}d</Badge>;
  }
  if (days < 30) {
    return (
      <Badge
        variant="outline"
        className="border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/30"
      >
        en {days}d
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-muted-foreground">
      en {days}d
    </Badge>
  );
}

function TypeIcon({ type }: { type: ReminderType }) {
  if (type === "vaccination")
    return <Syringe className="size-4 text-muted-foreground" />;
  if (type === "deworming")
    return <Bug className="size-4 text-muted-foreground" />;
  return <Calendar className="size-4 text-muted-foreground" />;
}

function typeLabel(type: ReminderType): string {
  switch (type) {
    case "vaccination":
      return "Vacuna";
    case "deworming":
      return "Desparasitación";
    case "appointment":
      return "Cita";
  }
}

async function fetchEnrichedReminders(
  petId: string,
  windowDays: number
): Promise<{ row: ReminderRow; label: string }[]> {
  const supabase = await createClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const until = new Date(today);
  until.setDate(until.getDate() + windowDays);

  const todayIso = today.toISOString().split("T")[0];
  const untilIso = until.toISOString().split("T")[0];

  const { data: reminders } = await supabase
    .from("reminders")
    .select("id, type, source_table, source_id, due_date, status")
    .eq("pet_id", petId)
    .eq("status", "pending")
    .lte("due_date", untilIso)
    .gte("due_date", todayIso)
    .order("due_date", { ascending: true });

  if (!reminders || reminders.length === 0) return [];

  // Enriquecemos con el nombre según source_table.
  const vaxIds = reminders
    .filter((r) => r.source_table === "vaccinations" && r.source_id)
    .map((r) => r.source_id as string);
  const dewormIds = reminders
    .filter((r) => r.source_table === "dewormings" && r.source_id)
    .map((r) => r.source_id as string);

  const [vaxResp, dewormResp] = await Promise.all([
    vaxIds.length
      ? supabase
          .from("vaccinations")
          .select("id, vaccine_name")
          .in("id", vaxIds)
      : Promise.resolve({ data: [] as { id: string; vaccine_name: string }[] }),
    dewormIds.length
      ? supabase
          .from("dewormings")
          .select("id, type, product")
          .in("id", dewormIds)
      : Promise.resolve({
          data: [] as { id: string; type: string; product: string | null }[],
        }),
  ]);

  const vaxMap = new Map((vaxResp.data ?? []).map((v) => [v.id, v.vaccine_name]));
  const dewormMap = new Map(
    (dewormResp.data ?? []).map((d) => [
      d.id,
      `Desparasitación ${d.type}${d.product ? " · " + d.product : ""}`,
    ])
  );

  return reminders.map((r) => {
    let label = typeLabel(r.type);
    if (r.source_table === "vaccinations" && r.source_id) {
      label = vaxMap.get(r.source_id) ?? label;
    } else if (r.source_table === "dewormings" && r.source_id) {
      label = dewormMap.get(r.source_id) ?? label;
    }
    return { row: r as ReminderRow, label };
  });
}

export async function UpcomingRemindersCard({
  petId,
  windowDays = 90,
}: UpcomingRemindersCardProps) {
  const items = await fetchEnrichedReminders(petId, windowDays);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Próximos vencimientos</CardTitle>
        <CardDescription>
          Vacunas y desparasitaciones pendientes en los próximos {windowDays}{" "}
          días.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay vencimientos próximos.
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map(({ row, label }) => {
              const days = diffInDays(row.due_date);
              return (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <TypeIcon type={row.type} />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(row.due_date)}
                      </p>
                    </div>
                  </div>
                  <UrgencyBadge days={days} />
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
