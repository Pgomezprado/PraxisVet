"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Loader2, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updatePersonalPet, type TutorProfile } from "../actions";

type ProfileField = {
  key: keyof TutorProfile;
  label: string;
  placeholder: string;
  textarea?: boolean;
  rows?: number;
};

const SECTIONS: { title: string; description: string; fields: ProfileField[] }[] = [
  {
    title: "Conoce a tu regalón",
    description: "Lo más esencial de su personalidad.",
    fields: [
      {
        key: "nickname",
        label: "Apodo cariñoso",
        placeholder: "Ej: Pokito, Bebé, Capo",
      },
      {
        key: "personality",
        label: "Personalidad",
        placeholder: "Ej: Muy juguetón, le encanta correr y conocer gente nueva",
        textarea: true,
        rows: 2,
      },
    ],
  },
  {
    title: "Lo que más le gusta",
    description: "Para mimarlo con lo que ya sabe disfrutar.",
    fields: [
      {
        key: "food_brand",
        label: "Alimento (marca y tipo)",
        placeholder: "Ej: Royal Canin Maxi Adult",
      },
      {
        key: "food_notes",
        label: "Cómo y cuánto come",
        placeholder: "Ej: 200g dos veces al día, prefiere húmedo",
        textarea: true,
        rows: 2,
      },
      {
        key: "favorite_toy",
        label: "Juguete favorito",
        placeholder: "Ej: pelota de tenis, peluche del oso",
      },
      {
        key: "favorite_treat",
        label: "Premio favorito",
        placeholder: "Ej: galletas de queso, snacks de pollo",
      },
      {
        key: "walk_routine",
        label: "Paseos y ejercicio",
        placeholder: "Ej: 2 paseos al día, le gusta el parque del barrio",
        textarea: true,
        rows: 2,
      },
    ],
  },
  {
    title: "Cuidados especiales",
    description: "Lo que toda persona que lo cuide debe saber.",
    fields: [
      {
        key: "allergies",
        label: "Alergias o cosas que le caen mal",
        placeholder: "Ej: alérgico al pollo, diarrea con cambios de comida",
        textarea: true,
        rows: 2,
      },
      {
        key: "likes",
        label: "Le gusta",
        placeholder: "Ej: agua, otros perros, niños, paseos largos",
        textarea: true,
        rows: 2,
      },
      {
        key: "dislikes",
        label: "No le gusta / le da miedo",
        placeholder: "Ej: ruidos fuertes, quedarse solo, gatos",
        textarea: true,
        rows: 2,
      },
    ],
  },
];

export function PersonalPetProfileDialog({
  petId,
  initial,
  petName,
}: {
  petId: string;
  initial: TutorProfile;
  petName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<TutorProfile>(initial);

  function update(key: keyof TutorProfile, val: string) {
    setValues((prev) => ({ ...prev, [key]: val }));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updatePersonalPet({
        pet_id: petId,
        tutor_profile: values,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  const hasAny = Object.values(initial ?? {}).some(
    (v) => typeof v === "string" && v.trim().length > 0
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            {hasAny ? (
              <>
                <Pencil className="h-3.5 w-3.5" />
                Editar perfil
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                Cuéntanos más de {petName}
              </>
            )}
          </Button>
        }
      />
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Perfil de {petName}</DialogTitle>
          <DialogDescription>
            Mientras más nos cuentes, mejor podemos sugerirte productos,
            paseos y servicios pensados para tu regalón.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="max-h-[55vh] space-y-6 overflow-y-auto pr-1">
            {SECTIONS.map((section) => (
              <section key={section.title} className="space-y-3">
                <header>
                  <h3 className="text-sm font-semibold">{section.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {section.description}
                  </p>
                </header>
                <div className="space-y-3">
                  {section.fields.map((field) => (
                    <div key={field.key} className="space-y-1.5">
                      <Label htmlFor={field.key}>{field.label}</Label>
                      {field.textarea ? (
                        <Textarea
                          id={field.key}
                          value={(values[field.key] ?? "") as string}
                          onChange={(e) => update(field.key, e.target.value)}
                          placeholder={field.placeholder}
                          rows={field.rows ?? 2}
                          disabled={pending}
                        />
                      ) : (
                        <Input
                          id={field.key}
                          value={(values[field.key] ?? "") as string}
                          onChange={(e) => update(field.key, e.target.value)}
                          placeholder={field.placeholder}
                          disabled={pending}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando…
                </>
              ) : (
                "Guardar perfil"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
