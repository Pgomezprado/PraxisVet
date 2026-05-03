"use client";

import { useState, useTransition } from "react";
import { QrCode, ShieldCheck, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { HealthCardSheet } from "./health-card-sheet";
import { HealthCardListSheet } from "./health-card-list-sheet";
import type { HealthCardSummary } from "../actions";

type Props = {
  clinicSlug: string;
  clinicName: string;
  petId: string;
  petName: string;
  petSpecies: string | null;
  petAge: string | null;
  vaccineStats: {
    vigentes: number;
    porVencer: number;
    vencidas: number;
  };
  dewormingsAtDay: boolean;
  initialCards: HealthCardSummary[];
};

export function HealthCardButton(props: Props) {
  const [generateOpen, setGenerateOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  // Estado optimista local de cartolas (lista) para reflejar generación/revocación
  // sin esperar a que el RSC se revalide.
  const [cards, setCards] = useState<HealthCardSummary[]>(props.initialCards);
  const [, startTransition] = useTransition();

  const activeCount = cards.filter((c) => c.status === "active").length;
  const totalCount = cards.length;

  function handleNewCard(card: HealthCardSummary) {
    startTransition(() => {
      setCards((prev) => [card, ...prev]);
    });
  }

  function handleRevoked(cardId: string) {
    startTransition(() => {
      setCards((prev) =>
        prev.map((c) =>
          c.id === cardId
            ? { ...c, status: "revoked", revokedAt: new Date().toISOString() }
            : c
        )
      );
    });
  }

  return (
    <>
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <ShieldCheck className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-base font-semibold leading-tight">
                Cartola sanitaria
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Pasaporte sanitario para hoteles, paseadores y viajes
              </p>
              {activeCount > 0 ? (
                <p className="mt-1 text-[11px] text-emerald-500">
                  {activeCount === 1
                    ? "1 cartola activa"
                    : `${activeCount} cartolas activas`}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              size="default"
              className="w-full sm:w-auto"
              onClick={() => setGenerateOpen(true)}
            >
              <QrCode className="size-4" data-icon="inline-start" />
              Generar cartola QR
            </Button>
          </div>
        </CardContent>

        {totalCount > 0 ? (
          <button
            type="button"
            onClick={() => setListOpen(true)}
            className="flex w-full items-center justify-between border-t border-border/60 px-5 py-2.5 text-xs text-muted-foreground transition-colors hover:bg-muted/40"
          >
            <span>Ver cartolas emitidas ({totalCount})</span>
            <ChevronRight className="size-3.5" />
          </button>
        ) : null}
      </Card>

      <HealthCardSheet
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        clinicSlug={props.clinicSlug}
        clinicName={props.clinicName}
        petId={props.petId}
        petName={props.petName}
        petSpecies={props.petSpecies}
        petAge={props.petAge}
        vaccineStats={props.vaccineStats}
        dewormingsAtDay={props.dewormingsAtDay}
        onCreated={handleNewCard}
      />

      <HealthCardListSheet
        open={listOpen}
        onOpenChange={setListOpen}
        clinicSlug={props.clinicSlug}
        cards={cards}
        onRevoked={handleRevoked}
      />
    </>
  );
}
