import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle2, Circle } from "lucide-react";

export type OnboardingStep = {
  label: string;
  href: string;
  completed: boolean;
};

export function OnboardingChecklist({ steps }: { steps: OnboardingStep[] }) {
  const completed = steps.filter((s) => s.completed).length;
  if (completed === steps.length) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-semibold">
              Próximos pasos
            </CardTitle>
            <CardDescription>
              Configura tu clínica para aprovechar todas las funcionalidades.
            </CardDescription>
          </div>
          <Badge variant="secondary" className="shrink-0">
            {completed} / {steps.length}
          </Badge>
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${(completed / steps.length) * 100}%` }}
          />
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {steps.map((step) => (
            <li key={step.href}>
              <Link
                href={step.href}
                className="group flex items-center gap-3 rounded-lg border p-3 transition-colors hover:border-primary/40 hover:bg-muted/50"
              >
                {step.completed ? (
                  <CheckCircle2 className="size-5 shrink-0 text-primary" />
                ) : (
                  <Circle className="size-5 shrink-0 text-muted-foreground/50" />
                )}
                <span
                  className={
                    step.completed
                      ? "flex-1 text-sm text-muted-foreground line-through"
                      : "flex-1 text-sm"
                  }
                >
                  {step.label}
                </span>
                <ArrowRight className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
