"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";

export function ClinicsSearch() {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const initial = params.get("q") ?? "";
  const [value, setValue] = useState(initial);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncedRef = useRef(initial);

  // Si el querystring cambia desde fuera (limpiar filtros, etc.) sincronizar input
  useEffect(() => {
    const next = params.get("q") ?? "";
    if (next !== lastSyncedRef.current) {
      lastSyncedRef.current = next;
      setValue(next);
    }
  }, [params]);

  function pushQuery(nextValue: string) {
    const next = new URLSearchParams(params.toString());
    const trimmed = nextValue.trim();
    if (trimmed) {
      next.set("q", trimmed);
    } else {
      next.delete("q");
    }
    const qs = next.toString();
    lastSyncedRef.current = trimmed;
    startTransition(() => {
      router.replace(qs ? `/superadmin/clinicas?${qs}` : "/superadmin/clinicas");
    });
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setValue(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      pushQuery(next);
    }, 300);
  }

  function clear() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setValue("");
    pushQuery("");
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape" && value) {
      e.preventDefault();
      clear();
    }
  }

  return (
    <label className="space-y-1">
      <span className="text-xs font-medium text-muted-foreground">Buscar</span>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="search"
          value={value}
          disabled={pending}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Nombre o slug…"
          className="pl-7 pr-7"
        />
        {value && (
          <button
            type="button"
            onClick={clear}
            aria-label="Limpiar búsqueda"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </label>
  );
}
