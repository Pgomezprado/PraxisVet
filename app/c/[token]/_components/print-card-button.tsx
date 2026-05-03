"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintCardButton() {
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={() => window.print()}
      title="En el diálogo de impresión, elige 'Guardar como PDF' para descargar"
    >
      <Printer className="size-4" data-icon="inline-start" />
      Imprimir o guardar PDF
    </Button>
  );
}
