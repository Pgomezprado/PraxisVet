"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
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
import { formatCLP } from "@/lib/utils/format";
import type { RevenueSeries } from "@/app/[clinic]/analytics/queries";

const config: ChartConfig = {
  current: {
    label: "Este período",
    color: "var(--chart-1)",
  },
  previous: {
    label: "Año anterior",
    color: "var(--chart-2)",
  },
};

function formatBucketLabel(bucket: string): string {
  // bucket: "YYYY-MM-DD" o "YYYY-MM"
  const [y, m, d] = bucket.split("-");
  if (d) return `${d}-${m}`;
  return `${m}-${y.slice(2)}`;
}

function formatCompact(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}k`;
  return `$${value}`;
}

export function RevenueChart({
  series,
  periodLabel,
}: {
  series: RevenueSeries;
  periodLabel: string;
}) {
  const delta = series.deltaPct;
  const trend =
    delta === null
      ? "Sin datos del período anterior"
      : delta >= 0
      ? `+${delta.toFixed(1)}% vs año anterior`
      : `${delta.toFixed(1)}% vs año anterior`;

  const data = series.points.map((p) => ({
    ...p,
    label: formatBucketLabel(p.bucket),
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle>Ingresos cobrados</CardTitle>
            <CardDescription>{periodLabel}</CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold tracking-tight">
              {formatCLP(series.totalCurrent)}
            </p>
            <p
              className={
                delta === null
                  ? "text-xs text-muted-foreground"
                  : delta >= 0
                  ? "text-xs text-emerald-500"
                  : "text-xs text-rose-500"
              }
            >
              {trend}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState />
        ) : (
          <ChartContainer config={config} className="h-[280px] w-full">
            <LineChart data={data} margin={{ left: 8, right: 16, top: 8 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={16}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={formatCompact}
                width={60}
              />
              <ChartTooltip
                cursor={{ stroke: "var(--border)" }}
                content={
                  <ChartTooltipContent
                    formatter={(value) => formatCLP(Number(value))}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Line
                dataKey="previous"
                type="monotone"
                stroke="var(--color-previous)"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
              />
              <Line
                dataKey="current"
                type="monotone"
                stroke="var(--color-current)"
                strokeWidth={2.5}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="flex h-[280px] items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
      Sin ingresos en este período.
    </div>
  );
}
