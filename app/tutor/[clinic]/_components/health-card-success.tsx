"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, ExternalLink, Download, Check } from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SheetHeader, SheetTitle } from "@/components/ui/sheet";

type Props = {
  petName: string;
  clinicName: string;
  url: string;
  expiresAt: string;
  onBack: () => void;
};

export function HealthCardSuccess({
  petName,
  clinicName,
  url,
  expiresAt,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  // Triggera la animación post-mount (el efecto la dispara después del primer paint).
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Renderiza el QR en el canvas en alta resolución y guarda dataURL para descarga.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    QRCode.toCanvas(canvas, url, {
      errorCorrectionLevel: "M",
      width: 320,
      margin: 2,
      color: {
        // QR oscuro sobre fondo blanco para máxima escaneabilidad.
        dark: "#0a0f0c",
        light: "#ffffff",
      },
    }).catch(() => {
      // ignore
    });
    QRCode.toDataURL(url, {
      errorCorrectionLevel: "M",
      width: 720,
      margin: 2,
      color: { dark: "#0a0f0c", light: "#ffffff" },
    })
      .then(setDataUrl)
      .catch(() => setDataUrl(null));
  }, [url]);

  function handleCopy() {
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopied(true);
        toast.success("Link copiado");
        setTimeout(() => setCopied(false), 1800);
      })
      .catch(() => toast.error("No pudimos copiar el link"));
  }

  function handleWhatsApp() {
    const message =
      `Hola! Te paso la cartola sanitaria de ${petName} 🐾\n` +
      `Acá puedes ver sus vacunas y desparasitaciones al día:\n\n` +
      `${url}\n\n` +
      `Emitida por ${clinicName}.`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  }

  function handleDownloadPng() {
    if (!dataUrl) {
      toast.error("Aún cargando la imagen, intenta de nuevo en un segundo");
      return;
    }
    // Componemos un PNG con padding y datos básicos.
    const img = new Image();
    img.onload = () => {
      const W = 900;
      const H = 1100;
      const c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      // Fondo blanco
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, W, H);

      // Título
      ctx.fillStyle = "#0a0f0c";
      ctx.textAlign = "center";
      ctx.font = "700 36px 'Plus Jakarta Sans', system-ui, sans-serif";
      ctx.fillText(`Cartola sanitaria de ${petName}`, W / 2, 80);

      ctx.font = "500 22px 'Plus Jakarta Sans', system-ui, sans-serif";
      ctx.fillStyle = "#4b5b53";
      ctx.fillText(`Emitida por ${clinicName}`, W / 2, 120);

      // QR centrado
      const qrSize = 700;
      const qrX = (W - qrSize) / 2;
      const qrY = 170;
      ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

      // Pie con URL y fecha
      ctx.fillStyle = "#0a0f0c";
      ctx.font = "500 22px 'Plus Jakarta Sans', system-ui, sans-serif";
      ctx.fillText("Escanea con la cámara de tu teléfono", W / 2, qrY + qrSize + 50);

      ctx.fillStyle = "#4b5b53";
      ctx.font = "400 18px 'Geist Mono', monospace";
      ctx.fillText(url, W / 2, qrY + qrSize + 85);

      ctx.fillStyle = "#4b5b53";
      ctx.font = "400 18px 'Plus Jakarta Sans', system-ui, sans-serif";
      ctx.fillText(`Válida hasta ${formatDateLong(expiresAt)}`, W / 2, qrY + qrSize + 120);

      const link = document.createElement("a");
      link.download = `cartola-${petName.toLowerCase().replace(/\s+/g, "-")}.png`;
      link.href = c.toDataURL("image/png");
      link.click();
      toast.success("Imagen guardada");
    };
    img.src = dataUrl;
  }

  function handleView() {
    // ?preview=1 evita inflar view_count cuando el tutor abre desde su portal.
    const previewUrl = url.includes("?")
      ? `${url}&preview=1`
      : `${url}?preview=1`;
    window.open(previewUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>Cartola lista</SheetTitle>
      </SheetHeader>

      <div className="flex flex-col items-center gap-4 px-4">
        <div
          className={`rounded-2xl bg-white p-4 shadow-sm transition-all duration-200 ${
            mounted ? "scale-100 opacity-100" : "scale-95 opacity-0"
          }`}
        >
          <canvas
            ref={canvasRef}
            className="block size-[280px] sm:size-[320px]"
            aria-label={`Código QR de la cartola sanitaria de ${petName}`}
          />
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="group flex max-w-full items-center gap-2 rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs transition-colors hover:bg-muted"
          aria-label="Copiar link"
        >
          <span className="truncate font-mono text-foreground/80">{url}</span>
          {copied ? (
            <Check className="size-4 shrink-0 text-emerald-500" />
          ) : (
            <Copy className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
          )}
        </button>

        <div className="grid w-full grid-cols-3 gap-2">
          <Button
            type="button"
            onClick={handleWhatsApp}
            className="bg-[#25D366] text-white hover:bg-[#22c25e]"
          >
            <WhatsAppIcon className="size-4" data-icon="inline-start" />
            WhatsApp
          </Button>
          <Button type="button" variant="outline" onClick={handleDownloadPng}>
            <Download className="size-4" data-icon="inline-start" />
            PNG
          </Button>
          <Button type="button" variant="outline" onClick={handleView}>
            <ExternalLink className="size-4" data-icon="inline-start" />
            Ver
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Válida hasta {formatDateLong(expiresAt)}
        </p>
      </div>

      <div className="mt-2 px-4 pb-4">
        <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
          <p className="mb-1 font-medium text-foreground">¿Cómo la uso?</p>
          <ul className="list-inside list-disc space-y-0.5">
            <li>Hoteles, daycare y paseo</li>
            <li>Viaje SAG entre regiones</li>
            <li>Compartir con otra clínica</li>
          </ul>
        </div>
      </div>
    </>
  );
}

function formatDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Inline WhatsApp glyph (lucide no lo trae estable en v1.8).
function WhatsAppIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      <path d="M20.52 3.48A11.95 11.95 0 0 0 12.04 0C5.5 0 .2 5.3.2 11.84c0 2.09.55 4.13 1.6 5.93L0 24l6.4-1.68a11.83 11.83 0 0 0 5.64 1.43h.01c6.54 0 11.84-5.3 11.84-11.84 0-3.16-1.23-6.13-3.37-8.43ZM12.04 21.6h-.01a9.78 9.78 0 0 1-4.98-1.36l-.36-.21-3.8 1 1.02-3.7-.24-.38a9.74 9.74 0 0 1-1.5-5.11c0-5.39 4.39-9.78 9.78-9.78 2.61 0 5.07 1.02 6.91 2.87a9.7 9.7 0 0 1 2.87 6.92c0 5.39-4.4 9.75-9.7 9.75Zm5.36-7.31c-.29-.15-1.74-.86-2.01-.96-.27-.1-.47-.15-.66.15-.2.29-.76.96-.93 1.16-.17.2-.34.22-.63.07-.29-.15-1.24-.46-2.36-1.46-.87-.78-1.45-1.74-1.62-2.03-.17-.29-.02-.45.13-.6.13-.13.29-.34.44-.51.15-.17.2-.29.29-.49.1-.2.05-.37-.02-.51-.07-.15-.66-1.6-.91-2.18-.24-.57-.48-.49-.66-.5l-.56-.01c-.2 0-.51.07-.78.36-.27.29-1.02 1-1.02 2.43 0 1.43 1.04 2.81 1.18 3.01.15.2 2.05 3.13 4.97 4.39.69.3 1.23.48 1.66.61.69.22 1.32.19 1.81.12.55-.08 1.74-.71 1.99-1.4.24-.69.24-1.28.17-1.4-.07-.12-.27-.2-.56-.34Z" />
    </svg>
  );
}
