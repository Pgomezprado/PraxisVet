"use client";

import { useState } from "react";
import {
  Stethoscope,
  PawPrint,
  Share2,
  Copy,
  CheckCircle2,
  MessageCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { recordShareEvent } from "../actions";

const HUB_URL = "https://praxisvet.cl/mascotas";

function buildVetMessage(petName?: string | null): string {
  const intro = petName
    ? `Hola, tengo todo lo de ${petName} en una app que se llama PraxisVet`
    : "Hola, tengo todo lo de mi mascota en una app que se llama PraxisVet";
  return `${intro}: vacunas, peluquería, pasaporte sanitario y más, todo en un solo lugar 🐾\n\n¿Conocen la plataforma? Me encantaría que pudieran ver lo de mi mascota directo ahí: ${HUB_URL}`;
}

function buildTutorMessage(petName?: string | null): string {
  const subject = petName ?? "mi mascota";
  return `Tengo todo lo de ${subject} en una app que se llama PraxisVet 🐾 Vacunas, fotos, paseos, alergias... Te dejo el link por si quieres armar el perfil de tu regalón: ${HUB_URL}`;
}

type ShareKind = "share_with_vet" | "invite_tutor";

function ShareDialog({
  open,
  onOpenChange,
  kind,
  petName,
  petId,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  kind: ShareKind;
  petName?: string | null;
  petId?: string;
}) {
  const isVet = kind === "share_with_vet";
  const initialMessage = isVet
    ? buildVetMessage(petName)
    : buildTutorMessage(petName);

  const [message, setMessage] = useState(initialMessage);
  const [copied, setCopied] = useState(false);

  function record(channel: "whatsapp" | "copy") {
    void recordShareEvent({
      kind,
      channel,
      context: petId ? { pet_id: petId } : {},
    });
  }

  function handleWhatsApp() {
    record("whatsapp");
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener");
  }

  async function handleCopy() {
    record("copy");
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Si falla, no rompemos el flow.
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isVet ? "Cuéntale a tu vet sobre PraxisVet" : "Invita a otro dueño"}
          </DialogTitle>
          <DialogDescription>
            {isVet
              ? "Mientras más vets usen PraxisVet, más fácil será mantener todo lo de tu mascota en orden. Edita el mensaje si quieres."
              : "Mientras más tutores armen el perfil de su regalón, más útil se vuelve la comunidad. Edita el mensaje si quieres."}
          </DialogDescription>
        </DialogHeader>

        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
          className="resize-none"
        />

        <DialogFooter>
          <Button variant="outline" onClick={handleCopy}>
            {copied ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Copiado
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copiar texto
              </>
            )}
          </Button>
          <Button onClick={handleWhatsApp}>
            <MessageCircle className="h-4 w-4" />
            Abrir WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ShareCard({
  variant,
  petName,
  petId,
}: {
  variant: "both" | "vet-only" | "tutor-only";
  petName?: string | null;
  petId?: string;
}) {
  const [vetOpen, setVetOpen] = useState(false);
  const [tutorOpen, setTutorOpen] = useState(false);

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="flex flex-row items-start gap-3 space-y-0">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Share2 className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <CardTitle className="text-lg">Ayúdanos a sumar regalones</CardTitle>
          <CardDescription>
            Mientras más dueños y vets usemos PraxisVet, más útil se vuelve
            para todos.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {(variant === "both" || variant === "vet-only") && (
            <Button size="sm" onClick={() => setVetOpen(true)}>
              <Stethoscope className="h-3.5 w-3.5" />
              Cuéntale a tu vet
            </Button>
          )}
          {(variant === "both" || variant === "tutor-only") && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setTutorOpen(true)}
            >
              <PawPrint className="h-3.5 w-3.5" />
              Invita a otro dueño
            </Button>
          )}
        </div>
      </CardContent>

      {(variant === "both" || variant === "vet-only") && (
        <ShareDialog
          open={vetOpen}
          onOpenChange={setVetOpen}
          kind="share_with_vet"
          petName={petName}
          petId={petId}
        />
      )}
      {(variant === "both" || variant === "tutor-only") && (
        <ShareDialog
          open={tutorOpen}
          onOpenChange={setTutorOpen}
          kind="invite_tutor"
          petName={petName}
          petId={petId}
        />
      )}
    </Card>
  );
}
