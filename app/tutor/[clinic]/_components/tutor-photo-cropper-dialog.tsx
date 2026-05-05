"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const OUTPUT_SIZE = 512; // px — la foto final cuadrada (se muestra circular vía CSS)

interface TutorPhotoCropperDialogProps {
  open: boolean;
  imageSrc: string | null;
  petName: string;
  onCancel: () => void;
  onConfirm: (blob: Blob) => Promise<void>;
}

export function TutorPhotoCropperDialog({
  open,
  imageSrc,
  petName,
  onCancel,
  onConfirm,
}: TutorPhotoCropperDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  function handleOpenChange(next: boolean) {
    if (!next && !saving) {
      resetState();
      onCancel();
    }
  }

  function resetState() {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setError(null);
  }

  async function handleConfirm() {
    if (!imageSrc || !croppedAreaPixels) return;
    setError(null);
    setSaving(true);
    try {
      const blob = await cropImageToBlob(imageSrc, croppedAreaPixels);
      await onConfirm(blob);
      resetState();
    } catch {
      setError("No se pudo procesar la imagen. Intenta nuevamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajusta la foto de {petName}</DialogTitle>
          <DialogDescription>
            Arrastra para mover y usa el control para acercar.
          </DialogDescription>
        </DialogHeader>

        <div className="relative h-72 w-full overflow-hidden rounded-lg bg-muted">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          )}
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="w-12 shrink-0">Zoom</span>
            <input
              type="range"
              min={1}
              max={4}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-muted accent-primary"
              disabled={saving}
              aria-label="Acercar la foto"
            />
          </label>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={saving || !croppedAreaPixels}
          >
            {saving && (
              <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
            )}
            {saving ? "Guardando..." : "Guardar foto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

async function cropImageToBlob(imageSrc: string, area: Area): Promise<Blob> {
  const img = await loadImage(imageSrc);

  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas no disponible");

  ctx.drawImage(
    img,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("toBlob falló"));
      },
      "image/jpeg",
      0.9
    );
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}
