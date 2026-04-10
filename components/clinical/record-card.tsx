import Link from "next/link";
import { CalendarDays, Stethoscope, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { VitalsDisplay } from "./vitals-display";
import type { RecordWithVet } from "@/app/[clinic]/clients/[id]/pets/[petId]/records/actions";

interface RecordCardProps {
  record: RecordWithVet;
  href: string;
}

export function RecordCard({ record, href }: RecordCardProps) {
  const vetName = [record.vet.first_name, record.vet.last_name]
    .filter(Boolean)
    .join(" ") || "Sin asignar";

  const dateLabel = new Date(record.date + "T12:00:00").toLocaleDateString(
    "es-MX",
    { day: "numeric", month: "long", year: "numeric" }
  );

  return (
    <Link href={href}>
      <Card className="transition-colors hover:bg-muted/50">
        <CardContent className="flex items-start gap-4 py-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="size-3.5" />
                {dateLabel}
              </span>
              <span className="flex items-center gap-1.5">
                <Stethoscope className="size-3.5" />
                {vetName}
              </span>
            </div>

            {record.reason && (
              <p className="text-sm font-medium">{record.reason}</p>
            )}

            {record.diagnosis && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {record.diagnosis}
              </p>
            )}

            <VitalsDisplay
              weight={record.weight}
              temperature={record.temperature}
              heartRate={record.heart_rate}
              size="sm"
            />
          </div>
          <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
        </CardContent>
      </Card>
    </Link>
  );
}
