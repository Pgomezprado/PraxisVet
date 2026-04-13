"use client";

import {
  forwardRef,
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
  type FocusEvent,
} from "react";
import { createPortal } from "react-dom";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { es } from "date-fns/locale";
import { format, parse, isValid, subYears, addYears } from "date-fns";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  id?: string;
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: (e: FocusEvent<HTMLButtonElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  name?: string;
  className?: string;
  "aria-invalid"?: boolean;
}

/**
 * DatePicker temático con popover vía React Portal.
 * Evita el clipping por overflow-hidden de ancestros (ej: Card de shadcn).
 * Recibe y emite strings en formato yyyy-MM-dd (drop-in replacement de input type="date").
 */
export const DatePicker = forwardRef<HTMLButtonElement, DatePickerProps>(
  function DatePicker(
    {
      id,
      value,
      onChange,
      onBlur,
      placeholder = "Seleccionar fecha",
      disabled,
      name,
      className,
      "aria-invalid": ariaInvalid,
    },
    ref
  ) {
    const [open, setOpen] = useState(false);
    const [month, setMonth] = useState<Date>(() => new Date());
    const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
    const [mounted, setMounted] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      setMounted(true);
    }, []);

    const parsedDate =
      value && value.length > 0
        ? parse(value, "yyyy-MM-dd", new Date())
        : undefined;
    const selectedDate =
      parsedDate && isValid(parsedDate) ? parsedDate : undefined;

    const displayLabel = selectedDate
      ? format(selectedDate, "d 'de' MMMM, yyyy", { locale: es })
      : placeholder;

    // Altura estimada del popover (calendario + header nav + padding).
    // Si después del primer render el popover real mide distinto, re-calculamos.
    const ESTIMATED_POPOVER_HEIGHT = 360;
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
        // Cabe debajo → default
        top = rect.bottom + GAP;
      } else if (spaceAbove >= popoverHeight) {
        // No cabe debajo pero sí arriba → flip
        top = rect.top - popoverHeight - GAP;
      } else {
        // Viewport muy chico: pegar el popover al borde disponible más cercano
        top = Math.max(
          VIEWPORT_MARGIN,
          Math.min(
            rect.bottom + GAP,
            window.innerHeight - popoverHeight - VIEWPORT_MARGIN
          )
        );
      }

      setPosition({
        top,
        left: rect.left,
        width: rect.width,
      });
    }, []);

    // Sincronizar el mes con la fecha seleccionada al abrir
    useEffect(() => {
      if (open && selectedDate) {
        setMonth(selectedDate);
      }
    }, [open, selectedDate]);

    // Posicionar: primera pasada con estimación, segunda pasada con altura real
    // después de que el portal rendereó el popover en el DOM.
    useLayoutEffect(() => {
      if (!open) return;
      updatePosition();
      const raf = requestAnimationFrame(() => updatePosition());
      return () => cancelAnimationFrame(raf);
    }, [open, updatePosition]);

    // Reposicionar en scroll/resize mientras está abierto
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

    // Click afuera cierra (checa wrapper + popover porque están en trees separados)
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

    function handleSelect(date: Date | undefined) {
      if (!date) {
        onChange?.("");
      } else {
        onChange?.(format(date, "yyyy-MM-dd"));
      }
      setOpen(false);
    }

    const popover = open && mounted && (
      <div
        ref={popoverRef}
        style={{
          position: "fixed",
          top: position.top,
          left: position.left,
          minWidth: position.width,
        }}
        className="z-50 rounded-md border border-border bg-popover p-3 shadow-lg"
      >
        {/* Header custom con navegación año + mes */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMonth((m) => subYears(m, 1))}
              className="inline-flex size-7 items-center justify-center rounded-md border border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Año anterior"
            >
              <ChevronsLeft className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() =>
                setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
              }
              className="inline-flex size-7 items-center justify-center rounded-md border border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Mes anterior"
            >
              <ChevronLeft className="size-3.5" />
            </button>
          </div>

          <span className="text-sm font-semibold capitalize">
            {format(month, "MMMM yyyy", { locale: es })}
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() =>
                setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
              }
              className="inline-flex size-7 items-center justify-center rounded-md border border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Mes siguiente"
            >
              <ChevronRight className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setMonth((m) => addYears(m, 1))}
              className="inline-flex size-7 items-center justify-center rounded-md border border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Año siguiente"
            >
              <ChevronsRight className="size-3.5" />
            </button>
          </div>
        </div>

        <div
          style={
            {
              "--rdp-accent-color": "var(--primary)",
              "--rdp-accent-background-color":
                "color-mix(in oklch, var(--primary) 20%, transparent)",
              "--rdp-today-color": "var(--primary)",
              "--rdp-day-height": "36px",
              "--rdp-day-width": "36px",
              "--rdp-day_button-height": "34px",
              "--rdp-day_button-width": "34px",
              "--rdp-weekday-opacity": "0.6",
              "--rdp-outside-opacity": "0.35",
            } as React.CSSProperties
          }
        >
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            month={month}
            onMonthChange={setMonth}
            locale={es}
            showOutsideDays
            hideNavigation
            classNames={{
              month_caption: "hidden",
              nav: "hidden",
            }}
          />
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
            !selectedDate && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate capitalize">{displayLabel}</span>
          <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
        </button>

        {popover && createPortal(popover, document.body)}
      </div>
    );
  }
);
