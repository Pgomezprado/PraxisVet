import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Scissors, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCLP } from "@/lib/utils/format";
import type { GroomingRecordListItem } from "@/app/[clinic]/clients/[id]/pets/[petId]/grooming/actions";

interface LastGroomingSummaryProps {
  petName: string;
  records: GroomingRecordListItem[];
  /** Si se especifica, ignoramos este registro al elegir el "último" — útil
   *  cuando estás editando una sesión existente y no quieres mostrarte a ti
   *  mismo como referencia. */
  excludeRecordId?: string;
}

function formatGroomerName(
  groomer: GroomingRecordListItem["groomer"]
): string | null {
  if (!groomer) return null;
  const parts = [groomer.first_name, groomer.last_name]
    .filter((p): p is string => Boolean(p && p.trim()))
    .map((p) => p.trim());
  if (parts.length === 0) return null;
  return parts.join(" ");
}

export function LastGroomingSummary({
  petName,
  records,
  excludeRecordId,
}: LastGroomingSummaryProps) {
  const last = records.find((r) => r.id !== excludeRecordId);

  if (!last) {
    return (
      <Card className="border-dashed bg-muted/30">
        <CardContent className="flex items-center gap-3 py-4">
          <Sparkles className="size-4 text-muted-foreground" />
          <div className="space-y-0.5">
            <p className="text-sm font-medium">Primera vez en peluquería</p>
            <p className="text-xs text-muted-foreground">
              No hay sesiones previas registradas para {petName}. Anota lo que
              hagas hoy para tener historial.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const dateLabel = format(new Date(last.date), "d 'de' MMMM, yyyy", {
    locale: es,
  });
  const groomerName = formatGroomerName(last.groomer);

  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardContent className="space-y-3 py-4">
        <div className="flex items-center gap-2">
          <Scissors className="size-4 text-primary" />
          <p className="text-sm font-medium">Última peluquería de {petName}</p>
        </div>

        <div className="space-y-2 text-sm">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{dateLabel}</span>
            {groomerName && <> · {groomerName}</>}
            {last.price != null && last.price > 0 && (
              <> · {formatCLP(last.price)}</>
            )}
          </p>

          {last.service_performed && last.service_performed.trim() && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Servicio
              </p>
              <p className="text-sm">{last.service_performed}</p>
            </div>
          )}

          {last.observations && last.observations.trim() && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Observaciones
              </p>
              <p className="text-sm whitespace-pre-wrap">{last.observations}</p>
            </div>
          )}

          {!last.service_performed?.trim() && !last.observations?.trim() && (
            <p className="text-xs italic text-muted-foreground">
              No quedaron notas de esa sesión.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
