import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { DewormingWithVet } from "@/app/[clinic]/clients/[id]/pets/[petId]/dewormings/actions";

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function vetName(firstName: string | null, lastName: string | null): string {
  const parts = [firstName, lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "Sin asignar";
}

interface DewormingInlineListProps {
  dewormings: DewormingWithVet[];
}

export function DewormingInlineList({
  dewormings,
}: DewormingInlineListProps) {
  if (dewormings.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        Sin desparasitaciones registradas en esta consulta.
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      {dewormings.map((d, index) => (
        <div key={d.id}>
          {index > 0 && <Separator className="mb-3" />}
          <div className="grid gap-1">
            <div className="flex items-center gap-2">
              <Badge
                variant={d.type === "interna" ? "default" : "secondary"}
                className="capitalize"
              >
                {d.type}
              </Badge>
              {d.pregnant_cohabitation && (
                <Badge variant="outline" className="text-xs">
                  embarazada
                </Badge>
              )}
              {d.product && (
                <span className="text-sm font-medium">{d.product}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>Fecha: {formatDate(d.date_administered)}</span>
              {d.next_due_date && (
                <span>Próxima fecha: {formatDate(d.next_due_date)}</span>
              )}
              <span>
                Veterinario: {vetName(d.vet_first_name, d.vet_last_name)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
