"use client";

import { useEffect, useState, useTransition } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Bug,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { generateHealthCard, type HealthCardSummary } from "../actions";
import { HealthCardSuccess } from "./health-card-success";

type GeneratedCard = {
  id: string;
  token: string;
  url: string;
  expiresAt: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clinicSlug: string;
  clinicName: string;
  petId: string;
  petName: string;
  petSpecies: string | null;
  petAge: string | null;
  vaccineStats: { vigentes: number; porVencer: number; vencidas: number };
  dewormingsAtDay: boolean;
  onCreated: (summary: HealthCardSummary) => void;
};

export function HealthCardSheet({
  open,
  onOpenChange,
  clinicSlug,
  clinicName,
  petId,
  petName,
  petSpecies,
  petAge,
  vaccineStats,
  dewormingsAtDay,
  onCreated,
}: Props) {
  const [step, setStep] = useState<"preview" | "success">("preview");
  const [generated, setGenerated] = useState<GeneratedCard | null>(null);
  const [isPending, startTransition] = useTransition();

  // Cuando se cierra el sheet, resetear al primer paso después de la animación.
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setStep("preview");
        setGenerated(null);
      }, 250);
      return () => clearTimeout(t);
    }
  }, [open]);

  function handleGenerate() {
    startTransition(async () => {
      const res = await generateHealthCard(clinicSlug, { petId });
      if (!res.success) {
        toast.error(res.error || "No pudimos generar la cartola. Intenta de nuevo.");
        return;
      }
      setGenerated(res.data);
      // Notificamos al padre con un summary equivalente al que devuelve listHealthCards.
      onCreated({
        id: res.data.id,
        createdAt: new Date().toISOString(),
        expiresAt: res.data.expiresAt,
        revokedAt: null,
        viewCount: 0,
        lastViewedAt: null,
        status: "active",
        url: res.data.url,
      });
      toast.success("Cartola lista. Compártela cuando quieras.");
      setStep("success");
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92vh] overflow-y-auto rounded-t-2xl sm:mx-auto sm:max-w-md"
      >
        {step === "preview" ? (
          <PreviewStep
            petName={petName}
            petSpecies={petSpecies}
            petAge={petAge}
            clinicName={clinicName}
            vaccineStats={vaccineStats}
            dewormingsAtDay={dewormingsAtDay}
            isPending={isPending}
            onGenerate={handleGenerate}
            onCancel={() => onOpenChange(false)}
          />
        ) : generated ? (
          <HealthCardSuccess
            petName={petName}
            clinicName={clinicName}
            url={generated.url}
            expiresAt={generated.expiresAt}
            onBack={() => onOpenChange(false)}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

// ============================================================
// Paso 1: Preview
// ============================================================
function PreviewStep({
  petName,
  petSpecies,
  petAge,
  clinicName,
  vaccineStats,
  dewormingsAtDay,
  isPending,
  onGenerate,
  onCancel,
}: {
  petName: string;
  petSpecies: string | null;
  petAge: string | null;
  clinicName: string;
  vaccineStats: { vigentes: number; porVencer: number; vencidas: number };
  dewormingsAtDay: boolean;
  isPending: boolean;
  onGenerate: () => void;
  onCancel: () => void;
}) {
  const subtitle = [petSpecies, petAge].filter(Boolean).join(" · ") || "Mascota";
  return (
    <>
      <SheetHeader>
        <SheetTitle>Cartola sanitaria de {petName}</SheetTitle>
        <SheetDescription>
          Vista previa de lo que verán quienes escaneen el QR.
        </SheetDescription>
      </SheetHeader>

      <div className="space-y-4 px-4 pb-2">
        <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <ShieldCheck className="size-3.5" />
            Vista previa
          </div>

          <p className="text-base font-semibold">{petName}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>

          <Separator className="my-3" />

          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
              <span>
                <strong className="font-semibold">{vaccineStats.vigentes}</strong>{" "}
                {vaccineStats.vigentes === 1
                  ? "vacuna vigente"
                  : "vacunas vigentes"}
              </span>
            </li>
            {vaccineStats.porVencer > 0 ? (
              <li className="flex items-center gap-2">
                <AlertTriangle className="size-4 shrink-0 text-amber-500" />
                <span>
                  <strong className="font-semibold">
                    {vaccineStats.porVencer}
                  </strong>{" "}
                  {vaccineStats.porVencer === 1 ? "próxima" : "próximas"} a
                  vencer
                </span>
              </li>
            ) : null}
            {vaccineStats.vencidas > 0 ? (
              <li className="flex items-center gap-2">
                <XCircle className="size-4 shrink-0 text-red-500" />
                <span>
                  <strong className="font-semibold">
                    {vaccineStats.vencidas}
                  </strong>{" "}
                  {vaccineStats.vencidas === 1 ? "vacuna vencida" : "vacunas vencidas"}
                </span>
              </li>
            ) : null}
            <li className="flex items-center gap-2">
              <Bug className="size-4 shrink-0 text-emerald-500" />
              <span>
                Desparasitación{" "}
                {dewormingsAtDay ? "al día" : "sin registros recientes"}
              </span>
            </li>
          </ul>
        </div>

        <p className="text-xs text-muted-foreground">
          Esta cartola será válida por 30 días y la firma{" "}
          <span className="font-medium text-foreground">{clinicName}</span>.
        </p>
      </div>

      <div className="mt-auto flex flex-col gap-2 p-4">
        <Button
          size="lg"
          className="w-full"
          disabled={isPending}
          onClick={onGenerate}
        >
          {isPending ? "Generando cartola..." : "Generar y compartir"}
        </Button>
        <Button
          variant="ghost"
          size="lg"
          className="w-full"
          disabled={isPending}
          onClick={onCancel}
        >
          Cancelar
        </Button>
      </div>
    </>
  );
}

