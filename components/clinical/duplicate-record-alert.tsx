"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DuplicateRecordAlertProps {
  existingRecordHref: string;
}

export function DuplicateRecordAlert({
  existingRecordHref,
}: DuplicateRecordAlertProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="flex flex-col gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <AlertCircle className="size-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
        <div>
          <p className="font-medium text-amber-900 dark:text-amber-100">
            Ya existe una ficha de hoy para esta mascota
          </p>
          <p className="text-xs text-amber-800 dark:text-amber-200">
            Revisa si ya se registró la consulta antes de crear una nueva.
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setDismissed(true)}
        >
          Crear otra igual
        </Button>
        <Link href={existingRecordHref}>
          <Button type="button" size="sm">
            Ver ficha de hoy
          </Button>
        </Link>
      </div>
    </div>
  );
}
