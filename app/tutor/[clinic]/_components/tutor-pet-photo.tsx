"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Camera, Loader2, PawPrint, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { updatePetPhoto } from "../actions";
import { TutorPhotoCropperDialog } from "./tutor-photo-cropper-dialog";

const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const BUCKET = "pet-photos";

interface TutorPetPhotoProps {
  clinicSlug: string;
  petId: string;
  petName: string;
  initialPhotoUrl: string | null;
}

export function TutorPetPhoto({
  clinicSlug,
  petId,
  petName,
  initialPhotoUrl,
}: TutorPetPhotoProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(initialPhotoUrl);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cropperSrc, setCropperSrc] = useState<string | null>(null);

  function readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleFile(file: File) {
    setError(null);

    if (!ALLOWED_TYPES.has(file.type)) {
      setError("Formato no válido. Usa JPG, PNG o WebP.");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError("La imagen es muy grande. Máximo 5 MB.");
      return;
    }

    const dataUrl = await readFile(file);
    setCropperSrc(dataUrl);
  }

  async function handleConfirmCrop(blob: Blob) {
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Tu sesión expiró. Vuelve a entrar al portal.");
      return;
    }

    const path = `tutor/${user.id}/${crypto.randomUUID()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, {
        cacheControl: "3600",
        contentType: "image/jpeg",
      });

    if (uploadError) {
      setError("No se pudo subir la foto. Intenta nuevamente.");
      throw uploadError;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(path);

    const result = await updatePetPhoto(clinicSlug, {
      petId,
      photoUrl: publicUrl,
    });

    if (!result.success) {
      setError(result.error || "No se pudo guardar la foto.");
      throw new Error(result.error);
    }

    setPhotoUrl(publicUrl);
    setCropperSrc(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleRemove() {
    setError(null);
    setRemoving(true);
    const result = await updatePetPhoto(clinicSlug, {
      petId,
      photoUrl: null,
    });
    setRemoving(false);
    if (!result.success) {
      setError(result.error || "No se pudo quitar la foto.");
      return;
    }
    setPhotoUrl(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function triggerPicker() {
    inputRef.current?.click();
  }

  const busy = removing;

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={triggerPicker}
            disabled={busy}
            aria-label={
              photoUrl ? `Cambiar foto de ${petName}` : `Subir foto de ${petName}`
            }
            className="group relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 ring-2 ring-transparent transition hover:ring-primary/40 disabled:opacity-60"
          >
            {photoUrl ? (
              <Image
                src={photoUrl}
                alt={petName}
                fill
                sizes="56px"
                className="object-cover"
              />
            ) : (
              <PawPrint className="size-6 text-primary" />
            )}

            {busy ? (
              <span className="absolute inset-0 flex items-center justify-center bg-background/70">
                <Loader2 className="size-4 animate-spin text-primary" />
              </span>
            ) : (
              <span className="absolute inset-x-0 bottom-0 flex h-2/5 items-end justify-center bg-linear-to-t from-black/60 to-transparent pb-1 opacity-0 transition group-hover:opacity-100">
                <Camera className="size-3 text-white" />
              </span>
            )}
          </button>

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </div>

        {photoUrl && !busy && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            className="h-7 px-2 text-xs"
          >
            <X className="size-3" data-icon="inline-start" />
            Quitar
          </Button>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      <TutorPhotoCropperDialog
        open={cropperSrc !== null}
        imageSrc={cropperSrc}
        petName={petName}
        onCancel={() => {
          setCropperSrc(null);
          if (inputRef.current) inputRef.current.value = "";
        }}
        onConfirm={handleConfirmCrop}
      />
    </>
  );
}
