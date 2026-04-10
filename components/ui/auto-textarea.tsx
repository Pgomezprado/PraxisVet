"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const AutoTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, onInput, ...props }, ref) => {
  const internalRef = React.useRef<HTMLTextAreaElement | null>(null);

  const adjustHeight = React.useCallback((el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  React.useEffect(() => {
    if (internalRef.current) {
      adjustHeight(internalRef.current);
    }
  }, [adjustHeight]);

  function handleInput(e: React.FormEvent<HTMLTextAreaElement>) {
    adjustHeight(e.currentTarget);
    onInput?.(e as React.InputEvent<HTMLTextAreaElement>);
  }

  function setRefs(el: HTMLTextAreaElement | null) {
    internalRef.current = el;
    if (typeof ref === "function") {
      ref(el);
    } else if (ref) {
      ref.current = el;
    }
  }

  return (
    <textarea
      ref={setRefs}
      data-slot="auto-textarea"
      className={cn(
        "w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none resize-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30",
        className
      )}
      rows={2}
      style={{ maxHeight: "calc(1.5em * 8 + 1rem + 2px)", overflow: "auto" }}
      onInput={handleInput}
      {...props}
    />
  );
});

AutoTextarea.displayName = "AutoTextarea";

export { AutoTextarea };
