"use client";

import {
  forwardRef,
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
  useMemo,
  type FocusEvent,
} from "react";
import { createPortal } from "react-dom";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimePickerProps {
  id?: string;
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: (e: FocusEvent<HTMLButtonElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  name?: string;
  className?: string;
  stepMinutes?: number;
  minHour?: number;
  maxHour?: number;
  /**
   * Limita los slots a estos rangos del día. Cada rango usa "HH:MM" o "HH:MM:SS".
   * Si se pasa, los slots fuera de los rangos no se muestran.
   */
  allowedRanges?: { start: string; end: string }[];
  /**
   * Define si el picker es de inicio o fin de un intervalo. Afecta cómo se
   * tratan los bordes del rango: "start" excluye el límite superior (no podés
   * empezar a la hora de cierre); "end" excluye el inferior (no podés terminar
   * al instante de apertura).
   */
  rangeMode?: "start" | "end";
  /** Si se pasa, sólo se muestran slots estrictamente mayores a este valor. */
  minTime?: string;
  "aria-invalid"?: boolean;
}

function generateSlots(step: number, minHour: number, maxHour: number) {
  const slots: string[] = [];
  for (let h = minHour; h <= maxHour; h++) {
    for (let m = 0; m < 60; m += step) {
      if (h === maxHour && m > 0) break;
      slots.push(
        `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
      );
    }
  }
  return slots;
}

function trimSeconds(t: string): string {
  return t.length >= 5 ? t.slice(0, 5) : t;
}

function isSlotInRanges(
  slot: string,
  ranges: { start: string; end: string }[],
  mode: "start" | "end"
): boolean {
  for (const r of ranges) {
    const start = trimSeconds(r.start);
    const end = trimSeconds(r.end);
    if (mode === "start") {
      if (slot >= start && slot < end) return true;
    } else {
      if (slot > start && slot <= end) return true;
    }
  }
  return false;
}

export const TimePicker = forwardRef<HTMLButtonElement, TimePickerProps>(
  function TimePicker(
    {
      id,
      value,
      onChange,
      onBlur,
      placeholder = "Seleccionar hora",
      disabled,
      name,
      className,
      stepMinutes = 15,
      minHour = 7,
      maxHour = 22,
      allowedRanges,
      rangeMode = "start",
      minTime,
      "aria-invalid": ariaInvalid,
    },
    ref
  ) {
    const [open, setOpen] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
    const [mounted, setMounted] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      setMounted(true);
    }, []);

    const slots = useMemo(() => {
      const ranges = allowedRanges?.filter(
        (r) => r.start && r.end && trimSeconds(r.start) < trimSeconds(r.end)
      );
      const hasRanges = ranges && ranges.length > 0;
      const effectiveMinHour = hasRanges
        ? Math.min(...ranges.map((r) => parseInt(trimSeconds(r.start).slice(0, 2), 10)))
        : minHour;
      const effectiveMaxHour = hasRanges
        ? Math.max(...ranges.map((r) => parseInt(trimSeconds(r.end).slice(0, 2), 10)))
        : maxHour;
      const all = generateSlots(stepMinutes, effectiveMinHour, effectiveMaxHour);
      return all.filter((slot) => {
        if (hasRanges && !isSlotInRanges(slot, ranges, rangeMode)) return false;
        if (minTime && slot <= trimSeconds(minTime)) return false;
        return true;
      });
    }, [stepMinutes, minHour, maxHour, allowedRanges, rangeMode, minTime]);

    const displayLabel = value && /^\d{2}:\d{2}$/.test(value) ? value : placeholder;
    const hasValue = !!value && /^\d{2}:\d{2}$/.test(value);

    const ESTIMATED_POPOVER_HEIGHT = 280;
    const GAP = 4;
    const VIEWPORT_MARGIN = 8;

    const updatePosition = useCallback(() => {
      if (!wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      const popoverHeight =
        popoverRef.current?.offsetHeight ?? ESTIMATED_POPOVER_HEIGHT;

      const spaceBelow = window.innerHeight - rect.bottom - GAP;
      const spaceAbove = rect.top - GAP;

      let top: number;
      if (spaceBelow >= popoverHeight) {
        top = rect.bottom + GAP;
      } else if (spaceAbove >= popoverHeight) {
        top = rect.top - popoverHeight - GAP;
      } else {
        top = Math.max(
          VIEWPORT_MARGIN,
          Math.min(
            rect.bottom + GAP,
            window.innerHeight - popoverHeight - VIEWPORT_MARGIN
          )
        );
      }

      setPosition({ top, left: rect.left, width: rect.width });
    }, []);

    useLayoutEffect(() => {
      if (!open) return;
      updatePosition();
      const raf = requestAnimationFrame(() => updatePosition());
      return () => cancelAnimationFrame(raf);
    }, [open, updatePosition]);

    useEffect(() => {
      if (!open) return;
      function handleReposition() {
        updatePosition();
      }
      window.addEventListener("scroll", handleReposition, true);
      window.addEventListener("resize", handleReposition);
      return () => {
        window.removeEventListener("scroll", handleReposition, true);
        window.removeEventListener("resize", handleReposition);
      };
    }, [open, updatePosition]);

    useEffect(() => {
      if (!open) return;
      function handleClick(e: MouseEvent) {
        const target = e.target as Node;
        if (
          wrapperRef.current?.contains(target) ||
          popoverRef.current?.contains(target)
        ) {
          return;
        }
        setOpen(false);
      }
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }, [open]);

    useEffect(() => {
      if (!open || !popoverRef.current || !hasValue) return;
      const selected = popoverRef.current.querySelector<HTMLElement>(
        `[data-slot-value="${value}"]`
      );
      selected?.scrollIntoView({ block: "center" });
    }, [open, value, hasValue]);

    function handleSelect(slot: string) {
      onChange?.(slot);
      setOpen(false);
    }

    const popover = open && mounted && (
      <div
        ref={popoverRef}
        style={{
          position: "fixed",
          top: position.top,
          left: position.left,
          minWidth: Math.max(position.width, 160),
        }}
        className="z-50 rounded-md border border-border bg-popover p-1 shadow-lg"
      >
        <div className="max-h-[260px] overflow-y-auto">
          {slots.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-muted-foreground">
              Sin horarios disponibles
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1 p-1">
              {slots.map((slot) => {
                const isSelected = slot === value;
                return (
                  <button
                    key={slot}
                    type="button"
                    data-slot-value={slot}
                    onClick={() => handleSelect(slot)}
                    className={cn(
                      "rounded px-2 py-1.5 text-sm text-center transition-colors",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-foreground"
                    )}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );

    return (
      <div ref={wrapperRef} className="relative">
        <button
          ref={ref}
          id={id}
          name={name}
          type="button"
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          onBlur={onBlur}
          aria-invalid={ariaInvalid}
          aria-expanded={open}
          className={cn(
            "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-1 text-left text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20",
            !hasValue && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">{displayLabel}</span>
          <Clock className="size-4 shrink-0 text-muted-foreground" />
        </button>

        {popover && createPortal(popover, document.body)}
      </div>
    );
  }
);
