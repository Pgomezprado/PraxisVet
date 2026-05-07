"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PetPhotoUpload } from "@/components/ui/pet-photo-upload";
import { updatePersonalPet } from "../actions";

export function PersonalPetPhotoEdit({
  petId,
  orgId,
  initialPhotoUrl,
}: {
  petId: string;
  orgId: string;
  initialPhotoUrl: string | null;
}) {
  const router = useRouter();
  const [photoUrl, setPhotoUrl] = useState<string | null>(initialPhotoUrl);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleChange(next: string | null) {
    setPhotoUrl(next);
    setError(null);
    startTransition(async () => {
      const result = await updatePersonalPet({
        pet_id: petId,
        photo_url: next,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <PetPhotoUpload
        orgId={orgId}
        value={photoUrl}
        onChange={handleChange}
      />
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
