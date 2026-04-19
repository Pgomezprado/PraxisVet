"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Loader2, PawPrint, Upload, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const BUCKET = "pet-photos";

interface PetPhotoUploadProps {
  orgId: string;
  value: string | null;
  onChange: (url: string | null) => void;
  disabled?: boolean;
}

export function PetPhotoUpload({
  orgId,
  value,
  onChange,
  disabled,
}: PetPhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    setUploading(true);

    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${orgId}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        contentType: file.type,
      });

    if (uploadError) {
      setUploading(false);
      setError("No se pudo subir la foto. Intenta nuevamente.");
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(path);

    setUploading(false);
    onChange(publicUrl);
  }

  function triggerPicker() {
    inputRef.current?.click();
  }

  function handleRemove() {
    setError(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted">
        {value ? (
          <Image
            src={value}
            alt="Foto del paciente"
            fill
            sizes="80px"
            className="object-cover"
          />
        ) : (
          <PawPrint className="size-8 text-muted-foreground" />
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={triggerPicker}
            disabled={disabled || uploading}
          >
            <Upload className="size-3.5" data-icon="inline-start" />
            {value ? "Cambiar foto" : "Subir foto"}
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={disabled || uploading}
            >
              <X className="size-3.5" data-icon="inline-start" />
              Quitar
            </Button>
          )}
        </div>
        {error ? (
          <p className="text-xs text-destructive">{error}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            JPG, PNG o WebP. Máximo 5 MB.
          </p>
        )}
      </div>

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
  );
}
