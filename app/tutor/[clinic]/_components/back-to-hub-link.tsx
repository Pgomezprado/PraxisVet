"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

const FLAG_KEY = "praxisvet:tutor:from-hub";

export function BackToHubLink() {
  const params = useSearchParams();
  const fromQuery = params.get("from") === "hub";
  const [fromStorage, setFromStorage] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (fromQuery) {
        window.sessionStorage.setItem(FLAG_KEY, "1");
        setFromStorage(true);
      } else if (window.sessionStorage.getItem(FLAG_KEY) === "1") {
        setFromStorage(true);
      }
    } catch {
      // sessionStorage puede fallar en private browsing — ignorar.
    }
  }, [fromQuery]);

  if (!fromQuery && !fromStorage) return null;

  return (
    <Link
      href="/mascotas"
      className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      Volver al hub
    </Link>
  );
}
