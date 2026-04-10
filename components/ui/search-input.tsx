"use client";

import { useRef, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SearchInputProps {
  placeholder?: string;
  paramName?: string;
}

export function SearchInput({
  placeholder = "Buscar...",
  paramName = "search",
}: SearchInputProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentValue = searchParams.get(paramName) ?? "";

  const updateSearch = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(paramName, value);
      } else {
        params.delete(paramName);
      }
      params.delete("page");
      router.replace(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams, paramName]
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => updateSearch(value), 300);
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className="relative flex-1 max-w-sm">
      <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        placeholder={placeholder}
        defaultValue={currentValue}
        onChange={handleChange}
        className="pl-9"
      />
    </div>
  );
}
