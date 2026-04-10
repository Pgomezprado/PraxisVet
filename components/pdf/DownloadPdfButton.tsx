"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DownloadPdfButtonProps {
  href: string;
  fileName: string;
  label?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "xs" | "lg";
}

export function DownloadPdfButton({
  href,
  fileName,
  label = "Descargar PDF",
  variant = "outline",
  size = "sm",
}: DownloadPdfButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const response = await fetch(href);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const message = errorData?.error || "Error al generar el PDF";
        throw new Error(message);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error descargando PDF:", error);
      alert(error instanceof Error ? error.message : "Error al descargar el PDF");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleDownload}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="size-3.5 animate-spin" data-icon="inline-start" />
      ) : (
        <Download className="size-3.5" data-icon="inline-start" />
      )}
      {label}
    </Button>
  );
}
