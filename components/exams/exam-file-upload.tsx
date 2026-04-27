"use client";

import { useRef, useState } from "react";
import { FileText, Loader2, Upload, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const BUCKET = "exam-files";

export interface UploadedExamFile {
  /** Path dentro del bucket privado `exam-files` (NO URL pública). */
  path: string;
  name: string;
  type: string;
  size: number;
}

interface ExamFileUploadProps {
  orgId: string;
  petId: string;
  examId: string;
  value: UploadedExamFile | null;
  onChange: (file: UploadedExamFile | null) => void;
  disabled?: boolean;
}

export function ExamFileUpload({
  orgId,
  petId,
  examId,
  value,
  onChange,
  disabled,
}: ExamFileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  async function handleFile(file: File) {
    setError(null);

    if (!ALLOWED_TYPES.has(file.type)) {
      setError("Solo PDF, JPG, PNG o WebP. Máximo 10 MB.");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError("El archivo es muy grande. Máximo 10 MB.");
      return;
    }

    setUploading(true);

    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const path = `${orgId}/${petId}/${examId}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });

    setUploading(false);

    if (uploadError) {
      setError("No se pudo subir el archivo. Intenta nuevamente.");
      return;
    }

    onChange({
      path,
      name: file.name,
      type: file.type,
      size: file.size,
    });
  }

  function triggerPicker() {
    inputRef.current?.click();
  }

  function handleRemove() {
    setError(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleDrag(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (disabled || uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div className="space-y-2">
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={cn(
          "relative flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed bg-muted/30 px-4 py-6 text-center transition-colors",
          dragActive
            ? "border-primary bg-primary/5"
            : "border-border/60 hover:border-border",
          disabled && "pointer-events-none opacity-60"
        )}
      >
        {value ? (
          <div className="flex w-full items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <FileText className="size-5 shrink-0 text-primary" />
              <div className="min-w-0 text-left">
                <p className="truncate text-sm font-medium">{value.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(value.size / 1024).toFixed(0)} KB
                </p>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={triggerPicker}
                disabled={disabled || uploading}
              >
                <Upload className="size-3.5" data-icon="inline-start" />
                Cambiar
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                disabled={disabled || uploading}
              >
                <X className="size-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          <>
            {uploading ? (
              <Loader2 className="size-6 animate-spin text-primary" />
            ) : (
              <Upload className="size-6 text-muted-foreground" />
            )}
            <div>
              <p className="text-sm font-medium">
                {uploading
                  ? "Subiendo archivo..."
                  : dragActive
                    ? "Suelta el archivo aquí"
                    : "Arrastra el archivo o haz click para seleccionarlo"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Solo PDF, JPG, PNG o WebP. Máximo 10 MB.
              </p>
            </div>
            {!uploading && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={triggerPicker}
                disabled={disabled}
              >
                Seleccionar archivo
              </Button>
            )}
          </>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}
