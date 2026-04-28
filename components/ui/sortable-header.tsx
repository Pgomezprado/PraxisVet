"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SortableHeaderProps {
  label: string;
  ascValue: string;
  descValue: string;
  paramName?: string;
  defaultDirection?: "asc" | "desc";
  className?: string;
}

export function SortableHeader({
  label,
  ascValue,
  descValue,
  paramName = "sort",
  defaultDirection = "asc",
  className,
}: SortableHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const current = searchParams.get(paramName) ?? "";
  const isAsc = current === ascValue;
  const isDesc = current === descValue;
  const isActive = isAsc || isDesc;

  function handleClick() {
    const params = new URLSearchParams(searchParams.toString());
    let next: string;
    if (!isActive) {
      next = defaultDirection === "asc" ? ascValue : descValue;
    } else if (isAsc) {
      next = descValue;
    } else {
      next = ascValue;
    }
    params.set(paramName, next);
    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`);
  }

  const Icon = !isActive ? ArrowUpDown : isAsc ? ArrowUp : ArrowDown;

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-sort={isAsc ? "ascending" : isDesc ? "descending" : "none"}
      className={cn(
        "inline-flex items-center gap-1.5 -mx-1 px-1 rounded-sm hover:text-foreground transition-colors",
        isActive ? "text-foreground" : "text-muted-foreground",
        className
      )}
    >
      <span>{label}</span>
      <Icon
        className={cn(
          "size-3.5 transition-opacity",
          isActive ? "opacity-100" : "opacity-50"
        )}
      />
    </button>
  );
}
