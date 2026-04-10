"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Select } from "@/components/ui/select";

interface FilterSelectProps {
  paramName: string;
  options: { value: string; label: string }[];
  placeholder: string;
  className?: string;
}

export function FilterSelect({
  paramName,
  options,
  placeholder,
  className,
}: FilterSelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentValue = searchParams.get(paramName) ?? "";

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    const value = e.target.value;
    if (value) {
      params.set(paramName, value);
    } else {
      params.delete(paramName);
    }
    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <Select
      value={currentValue}
      onChange={handleChange}
      className={className}
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </Select>
  );
}
