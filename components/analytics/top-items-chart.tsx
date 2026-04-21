import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCLP } from "@/lib/utils/format";
import type { TopItem } from "@/app/[clinic]/analytics/queries";

export function TopItemsChart({
  services,
  products,
  periodLabel,
}: {
  services: TopItem[];
  products: TopItem[];
  periodLabel: string;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <RankCard
        title="Top servicios"
        description={periodLabel}
        emptyLabel="Sin servicios facturados."
        items={services}
      />
      <RankCard
        title="Top productos"
        description={periodLabel}
        emptyLabel="Sin productos vendidos."
        items={products}
      />
    </div>
  );
}

function RankCard({
  title,
  description,
  items,
  emptyLabel,
}: {
  title: string;
  description: string;
  items: TopItem[];
  emptyLabel: string;
}) {
  const max = Math.max(...items.map((i) => i.revenue), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex h-40 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
            {emptyLabel}
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((item, index) => {
              const width = max === 0 ? 0 : (item.revenue / max) * 100;
              return (
                <li key={`${item.itemType}-${item.key}`} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate">
                      <span className="mr-2 text-xs text-muted-foreground tabular-nums">
                        #{index + 1}
                      </span>
                      {item.key}
                    </span>
                    <span className="font-medium tabular-nums">
                      {formatCLP(item.revenue)}
                    </span>
                  </div>
                  <div
                    className="h-2 rounded-full bg-muted"
                    aria-hidden="true"
                  >
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground tabular-nums">
                    {item.quantity.toLocaleString("es-CL")} unidades
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
