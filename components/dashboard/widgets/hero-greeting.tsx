import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getGreeting } from "@/lib/utils/format";

export function HeroGreeting({
  name,
  subtitle,
  highlights,
  actions,
}: {
  name: string;
  subtitle?: string;
  highlights?: string;
  actions?: React.ReactNode;
}) {
  const todayLabel = format(new Date(), "EEEE d 'de' MMMM", { locale: es });

  return (
    <section className="rounded-2xl border bg-linear-to-br from-primary/10 via-primary/5 to-transparent px-6 py-7">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-primary">{getGreeting()}</p>
          <h1 className="mt-1 truncate text-3xl font-bold tracking-tight sm:text-4xl">
            {name}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
          <p className="mt-2 text-xs capitalize text-muted-foreground">
            {todayLabel}
            {highlights && (
              <>
                {" · "}
                <span className="text-foreground/80">{highlights}</span>
              </>
            )}
          </p>
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </section>
  );
}
