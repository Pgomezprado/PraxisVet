import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PhysicalExam } from "@/types";

interface PhysicalExamDisplayProps {
  respiratoryRate: number | null;
  capillaryRefill: number | null;
  skinFold: number | null;
  physicalExam: PhysicalExam | null;
}

const FIELD_LABELS: Record<keyof PhysicalExam, string> = {
  mucous_color: "Mucosas",
  ear_inspection: "Oídos",
  ear_notes: "Detalle oídos",
  cough_reflex: "Reflejo tusígeno",
  lymph_nodes: "Linfonodos",
  lymph_nodes_notes: "Notas linfonodos",
  abdominal_palpation: "Palpación abdominal",
  abdominal_palpation_notes: "Notas palpación",
  consciousness: "Conciencia",
};

function formatValue(v: string) {
  return v.replace(/_/g, " ");
}

export function PhysicalExamDisplay({
  respiratoryRate,
  capillaryRefill,
  skinFold,
  physicalExam,
}: PhysicalExamDisplayProps) {
  const hasNumeric =
    respiratoryRate != null || capillaryRefill != null || skinFold != null;
  const hasObs =
    physicalExam &&
    Object.values(physicalExam).some((v) => v != null && v !== "");

  if (!hasNumeric && !hasObs) return null;

  const entries = physicalExam
    ? (Object.entries(physicalExam) as [keyof PhysicalExam, string][]).filter(
        ([, v]) => v != null && v !== ""
      )
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Examen físico</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasNumeric && (
          <div className="flex flex-wrap gap-4 text-sm">
            {respiratoryRate != null && (
              <div>
                <span className="text-muted-foreground">FR: </span>
                <span className="font-medium">{respiratoryRate} rpm</span>
              </div>
            )}
            {capillaryRefill != null && (
              <div>
                <span className="text-muted-foreground">TLLC: </span>
                <span className="font-medium">{capillaryRefill} s</span>
              </div>
            )}
            {skinFold != null && (
              <div>
                <span className="text-muted-foreground">PC: </span>
                <span className="font-medium">{skinFold} s</span>
              </div>
            )}
          </div>
        )}
        {entries.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {entries.map(([k, v]) => (
              <Badge key={k} variant="outline" className="text-xs">
                <span className="text-muted-foreground mr-1">
                  {FIELD_LABELS[k]}:
                </span>
                <span className="capitalize">{formatValue(v)}</span>
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
