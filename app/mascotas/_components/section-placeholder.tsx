import { ArrowRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type SectionPlaceholderProps = {
  icon: React.ComponentType<{ className?: string }>;
  eyebrow: string;
  title: string;
  description: string;
  status: "ready" | "coming-soon";
  bullets?: string[];
  ctaLabel?: string;
};

export function SectionPlaceholder({
  icon: Icon,
  eyebrow,
  title,
  description,
  status,
  bullets,
  ctaLabel,
}: SectionPlaceholderProps) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </span>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            {eyebrow}
          </p>
        </div>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
        <p className="text-base text-muted-foreground md:text-lg">{description}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {status === "ready" ? "Lo que vas a encontrar acá" : "Estamos sumando partners"}
          </CardTitle>
          <CardDescription>
            {status === "ready"
              ? "Esto se conecta con tu clínica o lo registras tú mismo."
              : "Cuando lancemos, te avisamos. Mientras, déjanos a tu mascota y te llegará primero a ti."}
          </CardDescription>
        </CardHeader>
        {bullets && bullets.length > 0 && (
          <CardContent className="space-y-2">
            <ul className="space-y-2 text-sm text-muted-foreground">
              {bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-2">
                  <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
            {ctaLabel && (
              <p className="pt-2 text-xs italic text-muted-foreground">
                {ctaLabel}
              </p>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
