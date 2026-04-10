"use client";

import * as React from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  alwaysOpen?: boolean;
  hasContent?: boolean;
  preview?: string;
  children: React.ReactNode;
}

function CollapsibleSection({
  title,
  defaultOpen = false,
  alwaysOpen = false,
  hasContent = false,
  preview,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = React.useState(alwaysOpen || defaultOpen);

  const isCollapsible = !alwaysOpen;

  return (
    <div className="rounded-lg border border-border">
      <button
        type="button"
        onClick={() => isCollapsible && setOpen((prev) => !prev)}
        className={cn(
          "flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium transition-colors",
          isCollapsible && "hover:bg-muted/50 cursor-pointer",
          !isCollapsible && "cursor-default"
        )}
        aria-expanded={open}
        disabled={alwaysOpen}
      >
        <div className="flex items-center gap-2">
          <span>{title}</span>
          {hasContent && !open && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              <Check className="h-3 w-3" />
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasContent && !open && preview && (
            <span className="max-w-[280px] truncate text-xs text-muted-foreground">
              {preview}
            </span>
          )}
          {isCollapsible && (
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform duration-200",
                open && "rotate-180"
              )}
            />
          )}
        </div>
      </button>
      {open && <div className="border-t border-border px-4 pb-4 pt-3">{children}</div>}
    </div>
  );
}

export { CollapsibleSection };
