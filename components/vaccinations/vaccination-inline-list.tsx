import { Separator } from "@/components/ui/separator";
import type { VaccinationWithVet } from "@/app/[clinic]/clients/[id]/pets/[petId]/vaccinations/actions";

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

interface VaccinationInlineListProps {
  vaccinations: VaccinationWithVet[];
}

export function VaccinationInlineList({
  vaccinations,
}: VaccinationInlineListProps) {
  if (vaccinations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        Sin vacunas registradas en esta consulta.
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      {vaccinations.map((vac, index) => (
        <div key={vac.id}>
          {index > 0 && <Separator className="mb-3" />}
          <div className="grid gap-1">
            <p className="font-medium text-sm">{vac.vaccine_name}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>Fecha: {formatDate(vac.date_administered)}</span>
              {vac.next_due_date && (
                <span>Próxima dosis: {formatDate(vac.next_due_date)}</span>
              )}
              <span>
                Veterinario:{" "}
                {vetName(vac.vet_first_name, vac.vet_last_name)}
              </span>
              {vac.lot_number && <span>Lote: {vac.lot_number}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
