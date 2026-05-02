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
 * Permite escribir la fecha manualmente (dd-MM-yyyy, dd/MM/yyyy) o elegirla del calendario.
 */
// Parser estricto: exige año de 4 dígitos. Usado mientras el usuario
// tipea, para no expandir "19" a "2019" antes de que termine de escribir
// (ej: si quiere ingresar "1990" o "1975").
function tryParseFullYear(raw: string): Date | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/[./]/g, "-");
  for (const fmt of ["dd-MM-yyyy", "d-M-yyyy"]) {
    const d = parse(normalized, fmt, new Date());
    if (isValid(d)) return d;
  }
  return null;
}

// Parser tolerante: acepta año corto. Sólo se usa en blur/Enter para
// aceptar formatos parciales como "15/3/24" cuando el usuario termina.
function tryParseTyped(raw: string): Date | null {
  const full = tryParseFullYear(raw);
  if (full) return full;
  const normalized = raw.trim().replace(/[./]/g, "-");
  for (const fmt of ["dd-MM-yy", "d-M-yy"]) {
    const d = parse(normalized, fmt, new Date());
    if (isValid(d)) return d;
  }
  return null;
}

// Aplica máscara dd/mm/aaaa mientras el usuario escribe. Quita cualquier
// carácter no numérico, limita a 8 dígitos y vuelve a insertar las barras.
function maskDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  function DatePicker(
    {
      id,
      value,
      onChange,
      onBlur,
      placeholder = "dd/mm/aaaa",
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

    // Texto visible en el input. Se sincroniza con el value prop (ej. cuando
    // el usuario elige desde el calendario) pero permite estados intermedios
    // mientras el usuario teclea algo inválido.
    const [inputText, setInputText] = useState<string>(
      selectedDate ? format(selectedDate, "dd/MM/yyyy") : ""
    );

    const selectedTime = selectedDate?.getTime();
    useEffect(() => {
      setInputText(selectedDate ? format(selectedDate, "dd/MM/yyyy") : "");
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedTime]);

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
      const popoverWidth = popoverRef.current?.offsetWidth ?? 320;

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

      // Clamp horizontal para no salirse del viewport cuando el popover
      // es más ancho que el trigger.
      const maxLeft = window.innerWidth - popoverWidth - VIEWPORT_MARGIN;
      const left = Math.max(VIEWPORT_MARGIN, Math.min(rect.left, maxLeft));

      setPosition({
        top,
        left,
        width: rect.width,
      });
    }, []);

    // Sincronizar el mes con la fecha seleccionada al abrir.
    // Dep: selectedTime (primitivo) en vez de selectedDate (objeto nuevo por
    // render). Sin esto, cada navegación del usuario disparaba un re-render que
    // creaba un nuevo selectedDate y revertía el mes a la fecha seleccionada.
    useEffect(() => {
      if (open && selectedTime) {
        setMonth(new Date(selectedTime));
      }
    }, [open, selectedTime]);

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
        setInputText("");
      } else {
        onChange?.(format(date, "yyyy-MM-dd"));
        setInputText(format(date, "dd/MM/yyyy"));
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
        }}
        className="z-50 w-[320px] rounded-md border border-border bg-popover p-3 shadow-lg"
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
          className="[&_.rdp-months]:!w-full [&_.rdp-month_grid]:!w-full [&_.rdp-weekday]:!text-center [&_.rdp-weekday]:!font-medium [&_.rdp-day]:!text-center [&_.rdp-day]:!p-0"
          style={
            {
              "--rdp-accent-color": "var(--primary)",
              "--rdp-accent-background-color":
                "color-mix(in oklch, var(--primary) 20%, transparent)",
              "--rdp-today-color": "var(--primary)",
              "--rdp-day-height": "40px",
              "--rdp-day-width": "40px",
              "--rdp-day_button-height": "36px",
              "--rdp-day_button-width": "36px",
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

    function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
      const masked = maskDateInput(e.target.value);
      const digits = masked.replace(/\D/g, "");
      setInputText(masked);
      if (masked === "") {
        onChange?.("");
        return;
      }
      // Sólo emitimos cuando hay 8 dígitos (año de 4 dígitos completo).
      // Así el usuario puede teclear años antiguos (ej: 1990) sin que
      // el parser interprete "19" como "2019" y bloquee la edición.
      if (digits.length === 8) {
        const parsed = tryParseFullYear(masked);
        if (parsed) {
          onChange?.(format(parsed, "yyyy-MM-dd"));
          setMonth(parsed);
        }
      }
    }

    function handleInputBlur(e: React.FocusEvent<HTMLInputElement>) {
      // Normaliza visualmente al perder foco si el texto parsea, o restaura
      // el valor canónico si no. Si el texto parsea pero todavía no se emitió
      // al padre (p.ej. año corto), confirmamos el onChange aquí.
      const parsed = tryParseTyped(inputText);
      if (parsed) {
        const iso = format(parsed, "yyyy-MM-dd");
        if (iso !== value) {
          onChange?.(iso);
        }
        setInputText(format(parsed, "dd/MM/yyyy"));
      } else if (inputText.trim() === "") {
        if (value) onChange?.("");
        setInputText("");
      } else {
        setInputText(selectedDate ? format(selectedDate, "dd/MM/yyyy") : "");
      }
      onBlur?.(e as unknown as React.FocusEvent<HTMLButtonElement>);
    }

    function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
      if (e.key === "Enter") {
        e.preventDefault();
        const parsed = tryParseTyped(inputText);
        if (parsed) {
          onChange?.(format(parsed, "yyyy-MM-dd"));
          setInputText(format(parsed, "dd/MM/yyyy"));
        }
        setOpen(false);
      } else if (e.key === "Escape") {
        setOpen(false);
      } else if (e.key === "ArrowDown" && !open) {
        e.preventDefault();
        setOpen(true);
      }
    }

    return (
      <div ref={wrapperRef} className="relative">
        <div
          className={cn(
            "flex h-9 w-full items-center gap-1 rounded-md border border-input bg-transparent pr-1 pl-3 shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20",
            disabled && "cursor-not-allowed opacity-50",
            className
          )}
          aria-invalid={ariaInvalid}
        >
          <input
            ref={ref}
            id={id}
            name={name}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            disabled={disabled}
            placeholder={placeholder}
            value={inputText}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            aria-invalid={ariaInvalid}
            className="h-full flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setOpen((o) => !o)}
            disabled={disabled}
            aria-label="Abrir calendario"
            aria-expanded={open}
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed"
          >
            <CalendarIcon className="size-4" />
          </button>
        </div>

        {popover && createPortal(popover, document.body)}
      </div>
    );
  }
);
