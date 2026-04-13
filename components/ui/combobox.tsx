"use client";

import {
  forwardRef,
  useState,
  useRef,
  useEffect,
  useCallback,
  type ChangeEvent,
  type KeyboardEvent,
  type FocusEvent,
} from "react";
import { cn } from "@/lib/utils";

interface ComboboxProps {
  id?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onBlur?: (e: FocusEvent<HTMLInputElement>) => void;
  options: readonly string[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  name?: string;
  "aria-invalid"?: boolean;
}

/**
 * Combobox no-restringido: permite elegir de la lista O escribir libremente.
 * El dropdown se posiciona debajo del input con absolute positioning.
 */
export const Combobox = forwardRef<HTMLInputElement, ComboboxProps>(
  function Combobox(
    {
      id,
      value: controlledValue,
      defaultValue,
      onChange,
      onBlur,
      options,
      placeholder,
      disabled,
      className,
      name,
      "aria-invalid": ariaInvalid,
    },
    ref
  ) {
    const [uncontrolledValue, setUncontrolledValue] = useState(
      defaultValue ?? ""
    );
    const isControlled = controlledValue !== undefined;
    const value = isControlled ? controlledValue : uncontrolledValue;

    const [open, setOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const filteredOptions =
      value.trim().length === 0
        ? options
        : options.filter((o) =>
            o.toLowerCase().includes(value.trim().toLowerCase())
          );

    const setValue = useCallback(
      (next: string) => {
        if (!isControlled) setUncontrolledValue(next);
        onChange?.(next);
      },
      [isControlled, onChange]
    );

    // Cerrar al hacer click afuera
    useEffect(() => {
      if (!open) return;
      function handleClick(e: MouseEvent) {
        if (
          wrapperRef.current &&
          !wrapperRef.current.contains(e.target as Node)
        ) {
          setOpen(false);
          setHighlightedIndex(-1);
        }
      }
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }, [open]);

    function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
      setValue(e.target.value);
      if (!open) setOpen(true);
      setHighlightedIndex(-1);
    }

    function handleSelect(option: string) {
      setValue(option);
      setOpen(false);
      setHighlightedIndex(-1);
    }

    function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (!open) setOpen(true);
        setHighlightedIndex((prev) =>
          Math.min(prev + 1, filteredOptions.length - 1)
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        if (open && highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          e.preventDefault();
          handleSelect(filteredOptions[highlightedIndex]);
        }
      } else if (e.key === "Escape") {
        setOpen(false);
        setHighlightedIndex(-1);
      }
    }

    return (
      <div ref={wrapperRef} className="relative">
        <input
          ref={ref}
          id={id}
          type="text"
          name={name}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          aria-invalid={ariaInvalid}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={id ? `${id}-listbox` : undefined}
          role="combobox"
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          onBlur={onBlur}
          onKeyDown={handleKeyDown}
          className={cn(
            "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20",
            className
          )}
        />

        {open && filteredOptions.length > 0 && (
          <ul
            id={id ? `${id}-listbox` : undefined}
            role="listbox"
            className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-lg"
          >
            {filteredOptions.map((option, idx) => {
              const isHighlighted = idx === highlightedIndex;
              return (
                <li
                  key={option}
                  role="option"
                  aria-selected={value === option}
                  onMouseDown={(e) => {
                    // mousedown antes que onBlur del input para que se aplique el select
                    e.preventDefault();
                    handleSelect(option);
                  }}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={cn(
                    "cursor-pointer rounded-sm px-2 py-1.5 text-sm",
                    isHighlighted
                      ? "bg-primary/15 text-primary"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  {option}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }
);
