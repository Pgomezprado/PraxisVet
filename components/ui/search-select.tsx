"use client";

import {
  forwardRef,
  useState,
  useRef,
  useEffect,
  useMemo,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { cn } from "@/lib/utils";

export type SearchSelectOption = {
  value: string;
  label: string;
  searchText?: string;
};

interface SearchSelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SearchSelectOption[];
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  "aria-invalid"?: boolean;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export const SearchSelect = forwardRef<HTMLInputElement, SearchSelectProps>(
  function SearchSelect(
    {
      id,
      value,
      onChange,
      options,
      placeholder,
      emptyText = "Sin resultados",
      disabled,
      className,
      "aria-invalid": ariaInvalid,
    },
    ref
  ) {
    const selectedOption = useMemo(
      () => options.find((o) => o.value === value),
      [options, value]
    );

    const [query, setQuery] = useState(selectedOption?.label ?? "");
    const [open, setOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      setQuery(selectedOption?.label ?? "");
    }, [selectedOption?.label]);

    const filteredOptions = useMemo(() => {
      const q = normalize(query.trim());
      const isExactSelectedLabel =
        selectedOption && query === selectedOption.label;
      if (!q || isExactSelectedLabel) return options;
      return options.filter((o) => {
        const haystack = normalize(o.searchText ?? o.label);
        return haystack.includes(q);
      });
    }, [options, query, selectedOption]);

    useEffect(() => {
      if (!open) return;
      function handleClick(e: MouseEvent) {
        if (
          wrapperRef.current &&
          !wrapperRef.current.contains(e.target as Node)
        ) {
          setOpen(false);
          setHighlightedIndex(-1);
          setQuery(selectedOption?.label ?? "");
        }
      }
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }, [open, selectedOption?.label]);

    function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
      setQuery(e.target.value);
      if (!open) setOpen(true);
      setHighlightedIndex(-1);
      if (value && e.target.value !== selectedOption?.label) {
        onChange("");
      }
    }

    function handleSelect(option: SearchSelectOption) {
      onChange(option.value);
      setQuery(option.label);
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
        setQuery(selectedOption?.label ?? "");
      }
    }

    return (
      <div ref={wrapperRef} className="relative">
        <input
          ref={ref}
          id={id}
          type="text"
          value={query}
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
          onKeyDown={handleKeyDown}
          className={cn(
            "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20",
            className
          )}
        />

        {open && (
          <ul
            id={id ? `${id}-listbox` : undefined}
            role="listbox"
            className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-lg"
          >
            {filteredOptions.length === 0 ? (
              <li className="px-2 py-1.5 text-sm text-muted-foreground">
                {emptyText}
              </li>
            ) : (
              filteredOptions.map((option, idx) => {
                const isHighlighted = idx === highlightedIndex;
                const isSelected = option.value === value;
                return (
                  <li
                    key={option.value}
                    role="option"
                    aria-selected={isSelected}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(option);
                    }}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={cn(
                      "cursor-pointer rounded-sm px-2 py-1.5 text-sm",
                      isHighlighted
                        ? "bg-primary/15 text-primary"
                        : isSelected
                          ? "bg-muted text-foreground"
                          : "text-foreground hover:bg-muted"
                    )}
                  >
                    {option.label}
                  </li>
                );
              })
            )}
          </ul>
        )}
      </div>
    );
  }
);
