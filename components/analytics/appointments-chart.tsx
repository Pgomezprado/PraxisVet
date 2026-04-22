"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { AppointmentsBreakdown } from "@/app/[clinic]/analytics/queries";

const config: ChartConfig = {
  completed: {
    label: "Realizadas",
    color: "var(--chart-1)",
  },
  no_show: {
    label: "No asistió",
    color: "var(--chart-3)",
  },
  cancelled: {
    label: "Canceladas",
    color: "var(--chart-2)",
  },
};

function formatBucketLabel(bucket: string): string {
  const [y, m, d] = bucket.split("-");
  if (d) return `${d}-${m}`;
  return `${m}-${y.slice(2)}`;
}

function fmtPct(value: number | null): string {
  if (value === null) return "—";
  return `${value.toFixed(0)}%`;
}

export function AppointmentsChart({
  data,
  periodLabel,
}: {
  data: AppointmentsBreakdown;
  periodLabel: string;
}) {
  const chartData = data.points.map((p) => ({
    ...p,
    label: formatBucketLabel(p.bucket),
  }));

  const hasData = data.totals.scheduled > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Citas y asistencia</CardTitle>
        <CardDescription>{periodLabel}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi label="Agendadas" value={data.totals.scheduled} />
          <Kpi label="Realizadas" value={data.totals.completed} />
          <Kpi label="No asistió" value={data.totals.no_show} />
          <Kpi
            label="Tasa de asistencia"
            value={fmtPct(data.totals.completionRate)}
            tone={
              data.totals.completionRate === null
                ? "muted"
                : data.totals.completionRate >= 85
                ? "good"
                : data.totals.completionRate >= 70
                ? "warn"
                : "bad"
            }
          />
        </div>

        {hasData ? (
          <ChartContainer config={config} className="h-[260px] w-full">
            <BarChart
              data={chartData}
              margin={{ left: 8, right: 16, top: 8 }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={16}
              />
              <YAxis tickLine={false} axisLine={false} width={32} />
              <ChartTooltip
                cursor={{ fill: "var(--muted)", opacity: 0.3 }}
                content={<ChartTooltipContent />}
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar
                dataKey="completed"
                fill="var(--color-completed)"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="no_show"
                fill="var(--color-no_show)"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="cancelled"
                fill="var(--color-cancelled)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="flex h-[260px] items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
            Sin citas en este período.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Kpi({
  label,
  value,
  tone = "muted",
}: {
  label: string;
  value: number | string;
  tone?: "muted" | "good" | "warn" | "bad";
}) {
  const toneClass =
    tone === "good"
      ? "text-emerald-500"
      : tone === "warn"
      ? "text-amber-500"
      : tone === "bad"
      ? "text-rose-500"
      : "text-foreground";
  return (
    <div className="rounded-lg border bg-card/50 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-xl font-semibold tracking-tight ${toneClass}`}>
        {value}
      </p>
    </div>
  );
}
