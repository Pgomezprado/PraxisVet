"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";

interface DaySelectorProps {
  clinicSlug: string;
  selectedDate: string;
  view: string;
}

export function DaySelector({ clinicSlug, selectedDate, view }: DaySelectorProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function handleDateChange(newDate: string) {
    if (newDate) {
      router.push(`/${clinicSlug}/appointments?view=${view}&date=${newDate}`);
      setOpen(false);
    }
  }

  const today = format(new Date(), "yyyy-MM-dd");
  const isToday = selectedDate === today;

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen(!open)}
        >
          <CalendarDays className="size-4" />
          Ir a fecha
        </Button>
        {open && (
          <div className="absolute top-full left-0 z-50 mt-1 w-56">
            <DatePicker
              value={selectedDate}
              onChange={handleDateChange}
            />
          </div>
        )}
      </div>
      {!isToday && (
        <Button
          variant="ghost"
          size="xs"
          onClick={() => handleDateChange(today)}
        >
          Hoy
        </Button>
      )}
    </div>
  );
}
