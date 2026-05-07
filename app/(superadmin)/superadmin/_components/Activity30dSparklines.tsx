import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export type ActivityPoint = {
  day: string;
  consultations: number;
  groomings: number;
  appointments: number;
};

type SeriesKey = "consultations" | "groomings" | "appointments";

const SERIES_META: Record<
  SeriesKey,
  { label: string; barClass: string; emptyClass: string }
> = {
  consultations: {
    label: "Consultas médicas",
    barClass: "bg-sky-500/70 group-hover/bar:bg-sky-400",
    emptyClass: "bg-muted/30",
  },
  groomings: {
    label: "Peluquerías",
    barClass: "bg-violet-500/70 group-hover/bar:bg-violet-400",
    emptyClass: "bg-muted/30",
  },
  appointments: {
    label: "Citas",
    barClass: "bg-primary/70 group-hover/bar:bg-primary",
    emptyClass: "bg-muted/30",
  },
};

function MiniBars({
  series,
  metaKey,
}: {
  series: ActivityPoint[];
  metaKey: SeriesKey;
}) {
  const max = Math.max(1, ...series.map((d) => d[metaKey]));
  const meta = SERIES_META[metaKey];
  return (
    <div className="flex h-12 items-end gap-[2px]">
      {series.map((d) => {
        const v = d[metaKey];
        const empty = v === 0;
        const h = Math.round((v / max) * 100);
        const tooltip = `${format(parseISO(d.day), "dd-MM-yyyy", { locale: es })} · ${v} ${meta.label.toLowerCase()}`;
        return (
          <div
            key={`${metaKey}-${d.day}`}
            className="group/bar flex h-full flex-1 items-end"
            title={tooltip}
          >
            <div
              className={`w-full rounded-sm transition-colors ${empty ? meta.emptyClass : meta.barClass}`}
              style={{ height: empty ? "3px" : `${Math.max(h, 8)}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}

export function Activity30dSparklines({
  series,
}: {
  series: ActivityPoint[];
}) {
  const totalConsult = series.reduce((s, d) => s + d.consultations, 0);
  const totalGroom = series.reduce((s, d) => s + d.groomings, 0);
  const totalAppt = series.reduce((s, d) => s + d.appointments, 0);
  const allZero = totalConsult + totalGroom + totalAppt === 0;

  if (allZero) {
    return (
      <div className="rounded-md border border-dashed border-border/60 bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
        Sin actividad en los últimos 30 días
      </div>
    );
  }

  const rows: { key: SeriesKey; total: number }[] = [
    { key: "consultations", total: totalConsult },
    { key: "groomings", total: totalGroom },
    { key: "appointments", total: totalAppt },
  ];

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const meta = SERIES_META[row.key];
        return (
          <div key={row.key} className="space-y-1">
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-muted-foreground">{meta.label}</span>
              <span className="font-mono tabular-nums">
                {row.total} en 30d
              </span>
            </div>
            <MiniBars series={series} metaKey={row.key} />
          </div>
        );
      })}
      <p className="pt-1 text-xs text-muted-foreground">
        {totalConsult} consultas · {totalGroom} peluquerías · {totalAppt} citas
        en los últimos 30 días
      </p>
    </div>
  );
}
