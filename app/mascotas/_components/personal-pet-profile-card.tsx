import {
  Sparkles,
  Cookie,
  ToyBrick,
  Footprints,
  Heart,
  AlertTriangle,
  Smile,
  ThumbsDown,
  Gift,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TutorProfile } from "../actions";
import { PersonalPetProfileDialog } from "./personal-pet-profile-dialog";

type Field = {
  key: keyof TutorProfile;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const FIELDS: Field[] = [
  { key: "personality", label: "Personalidad", icon: Heart },
  { key: "food_brand", label: "Alimento", icon: Cookie },
  { key: "food_notes", label: "Cómo come", icon: Cookie },
  { key: "favorite_toy", label: "Juguete favorito", icon: ToyBrick },
  { key: "favorite_treat", label: "Premio favorito", icon: Gift },
  { key: "walk_routine", label: "Paseos", icon: Footprints },
  { key: "allergies", label: "Alergias", icon: AlertTriangle },
  { key: "likes", label: "Le gusta", icon: Smile },
  { key: "dislikes", label: "No le gusta", icon: ThumbsDown },
];

export function PersonalPetProfileCard({
  petId,
  petName,
  profile,
}: {
  petId: string;
  petName: string;
  profile: TutorProfile;
}) {
  const populated = FIELDS.filter((f) => {
    const v = profile[f.key];
    return typeof v === "string" && v.trim().length > 0;
  });
  const hasNickname =
    typeof profile.nickname === "string" && profile.nickname.trim().length > 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start gap-3 space-y-0">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <CardTitle className="text-lg">Perfil de {petName}</CardTitle>
          <CardDescription>
            {populated.length === 0 && !hasNickname
              ? "Cuéntanos quién es y qué le encanta. Lo usaremos para sugerirte lo mejor para tu regalón."
              : "Lo que tu regalón ama, lo que come y lo que le da miedo."}
          </CardDescription>
        </div>
        <PersonalPetProfileDialog
          petId={petId}
          initial={profile}
          petName={petName}
        />
      </CardHeader>

      {(populated.length > 0 || hasNickname) && (
        <CardContent className="space-y-3">
          {hasNickname && (
            <div>
              <Badge variant="secondary" className="font-normal">
                También conocido como {profile.nickname}
              </Badge>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {populated.map((field) => {
              const Icon = field.icon;
              return (
                <div
                  key={field.key}
                  className="flex items-start gap-2 rounded-md border border-border/60 bg-card/40 p-2.5"
                >
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      {field.label}
                    </p>
                    <p className="text-sm">{profile[field.key]}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
