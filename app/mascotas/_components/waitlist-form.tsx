"use client";

import { useState, useTransition } from "react";
import { Mail, Loader2, CheckCircle2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { joinHubWaitlist } from "../actions";

type Section = "mall" | "viajes" | "proteccion" | "comunidad";

const SECTION_COPY: Record<
  Section,
  { title: string; description: string; notesLabel: string; notesPlaceholder: string }
> = {
  mall: {
    title: "Avísame cuando lance el Mall",
    description:
      "Suma tu email y te avisamos cuando estén las primeras tiendas. Si te interesa una marca específica, cuéntanos.",
    notesLabel: "¿Qué tipo de productos te interesan? (opcional)",
    notesPlaceholder: "Ej: alimento natural, juguetes resistentes, ropa para invierno",
  },
  viajes: {
    title: "Avísame cuando lance Viajes",
    description:
      "Hoteles pet-friendly, sitters y aerolíneas. Te escribimos cuando tengamos partners reales.",
    notesLabel: "¿A dónde te gustaría viajar? (opcional)",
    notesPlaceholder: "Ej: hoteles en el sur, sitters de confianza, vuelos a Buenos Aires",
  },
  proteccion: {
    title: "Avísame cuando lleguen los seguros",
    description:
      "Estamos cerrando alianzas con aseguradoras. Te escribimos antes de lanzar.",
    notesLabel: "¿Qué te preocupa cubrir? (opcional)",
    notesPlaceholder: "Ej: emergencias, cirugías, consultas regulares",
  },
  comunidad: {
    title: "Avísame cuando abra Comunidad",
    description:
      "Te escribimos cuando puedas seguir a otros regalones, compartir momentos y conocer tutores cerca de ti.",
    notesLabel: "¿Qué esperas de la comunidad? (opcional)",
    notesPlaceholder: "Ej: paseos grupales, tips de raza específica, encontrar pareja para mi mascota",
  },
};

export function WaitlistForm({
  section,
  defaultEmail,
  defaultSpecies,
}: {
  section: Section;
  defaultEmail?: string;
  defaultSpecies?: "canino" | "felino" | "exotico";
}) {
  const copy = SECTION_COPY[section];
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ wasNew: boolean } | null>(null);

  const [email, setEmail] = useState(defaultEmail ?? "");
  const [phone, setPhone] = useState("");
  const [species, setSpecies] = useState<string>(defaultSpecies ?? "");
  const [notes, setNotes] = useState("");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Ingresa un email válido");
      return;
    }

    startTransition(async () => {
      const result = await joinHubWaitlist({
        section,
        email: email.trim(),
        phone: phone.trim() || undefined,
        pet_species:
          species === "canino" || species === "felino" || species === "exotico"
            ? species
            : "",
        notes: notes.trim() || undefined,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }
      setDone({ wasNew: result.was_new });
    });
  }

  if (done) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="flex flex-row items-start gap-3 space-y-0">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <div>
            <CardTitle className="text-lg">
              {done.wasNew ? "Listo, te tenemos en la lista" : "Actualizamos tus datos"}
            </CardTitle>
            <CardDescription>
              Te escribimos a {email} apenas lance esta sección. Mientras
              tanto, sigue armando el perfil de tu regalón.
            </CardDescription>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start gap-3 space-y-0">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Mail className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <CardTitle className="text-lg">{copy.title}</CardTitle>
          <CardDescription>{copy.description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`${section}-email`}>Tu email</Label>
              <Input
                id={`${section}-email`}
                type="email"
                placeholder="tu@email.cl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={pending}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${section}-phone`}>WhatsApp (opcional)</Label>
              <Input
                id={`${section}-phone`}
                type="tel"
                placeholder="+56 9 XXXX XXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={pending}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${section}-species`}>
              ¿Qué mascota tienes? (opcional)
            </Label>
            <Select
              id={`${section}-species`}
              value={species}
              onChange={(e) => setSpecies(e.target.value)}
              disabled={pending}
            >
              <option value="">Prefiero no decir</option>
              <option value="canino">Canino (perro)</option>
              <option value="felino">Felino (gato)</option>
              <option value="exotico">Exótico (otro)</option>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${section}-notes`}>{copy.notesLabel}</Label>
            <Textarea
              id={`${section}-notes`}
              placeholder={copy.notesPlaceholder}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              disabled={pending}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <div className="flex justify-end pt-1">
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando…
                </>
              ) : (
                "Avísame primero"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
