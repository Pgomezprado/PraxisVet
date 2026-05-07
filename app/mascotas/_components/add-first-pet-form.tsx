"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PawPrint, Loader2 } from "lucide-react";
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
import { Combobox } from "@/components/ui/combobox";
import { getBreedSuggestions } from "@/lib/constants/breeds";
import { addFirstPet } from "../actions";

const SPECIES = [
  { value: "canino", label: "Canino (perro)" },
  { value: "felino", label: "Felino (gato)" },
  { value: "exotico", label: "Exótico (otro)" },
] as const;

export function AddFirstPetForm({ tutorFirstName }: { tutorFirstName: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [species, setSpecies] = useState<string>("");
  const [breed, setBreed] = useState("");
  const [birthdate, setBirthdate] = useState("");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Ponle un nombre a tu mascota");
      return;
    }
    if (!species) {
      setError("Selecciona la especie");
      return;
    }

    startTransition(async () => {
      const result = await addFirstPet({
        name: name.trim(),
        species: species as "canino" | "felino" | "exotico",
        breed: breed.trim() || undefined,
        birthdate: birthdate || undefined,
        tutor_first_name: tutorFirstName ?? undefined,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      router.push(`/mascotas/${result.petId}`);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <PawPrint className="h-5 w-5" />
          </span>
          <div>
            <CardTitle className="text-xl">Agrega tu primera mascota</CardTitle>
            <CardDescription>
              Aún sin clínica conectada, puedes empezar a guardar lo importante
              de tu regalón. Cuando tu vet se sume a PraxisVet, todo queda
              listo para enlazarse.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              placeholder="Ej: Coco"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
              disabled={pending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="species">Especie</Label>
            <Select
              id="species"
              value={species}
              onChange={(e) => setSpecies(e.target.value)}
              disabled={pending}
              required
            >
              <option value="" disabled>
                Elige una opción
              </option>
              {SPECIES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="breed">Raza (opcional)</Label>
              <Combobox
                id="breed"
                value={breed}
                onChange={setBreed}
                options={getBreedSuggestions(species)}
                placeholder={
                  species
                    ? "Escribe o elige de la lista"
                    : "Primero elige la especie"
                }
                disabled={pending || !species}
              />
              <p className="text-xs text-muted-foreground">
                Si no encuentras la raza, escríbela tal cual la conoces.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="birthdate">Fecha de nacimiento (opcional)</Label>
              <Input
                id="birthdate"
                type="date"
                value={birthdate}
                onChange={(e) => setBirthdate(e.target.value)}
                disabled={pending}
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando…
                </>
              ) : (
                "Guardar mi mascota"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
