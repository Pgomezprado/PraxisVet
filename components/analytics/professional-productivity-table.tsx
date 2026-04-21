import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCLP } from "@/lib/utils/format";
import type { ProfessionalRow } from "@/app/[clinic]/analytics/queries";

const roleLabels: Record<string, string> = {
  vet: "Veterinario",
  groomer: "Peluquero",
};

export function ProfessionalProductivityTable({
  rows,
  periodLabel,
}: {
  rows: ProfessionalRow[];
  periodLabel: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Productividad por profesional</CardTitle>
        <CardDescription>{periodLabel}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <div className="m-6 flex h-32 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
            Sin citas asignadas en el período.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-6 py-3 font-medium">Profesional</th>
                  <th className="px-4 py-3 text-right font-medium">
                    Agendadas
                  </th>
                  <th className="px-4 py-3 text-right font-medium">
                    Realizadas
                  </th>
                  <th className="px-4 py-3 text-right font-medium">
                    No asistió
                  </th>
                  <th className="px-4 py-3 text-right font-medium">
                    Asistencia
                  </th>
                  <th className="px-6 py-3 text-right font-medium">
                    Ingresos
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const attended = row.completed + row.noShow;
                  const rate =
                    attended === 0
                      ? null
                      : Math.round((row.completed / attended) * 100);
                  const name =
                    `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim() ||
                    "(sin nombre)";
                  return (
                    <tr
                      key={row.memberId}
                      className="border-b last:border-b-0 hover:bg-muted/30"
                    >
                      <td className="px-6 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium">{name}</span>
                          <Badge
                            variant="secondary"
                            className="mt-1 w-fit text-[10px] uppercase tracking-wide"
                          >
                            {roleLabels[row.role] ?? row.role}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {row.scheduled}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {row.completed}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {row.noShow}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {rate === null ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <span
                            className={
                              rate >= 85
                                ? "text-emerald-500"
                                : rate >= 70
                                ? "text-amber-500"
                                : "text-rose-500"
                            }
                          >
                            {rate}%
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right font-medium tabular-nums">
                        {formatCLP(row.revenue)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
