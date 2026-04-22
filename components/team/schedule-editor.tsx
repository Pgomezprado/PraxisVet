"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Calendar as CalendarIcon, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useClinic } from "@/lib/context/clinic-context";
import {
  replaceMemberWeeklySchedule,
  addMemberScheduleBlock,
  deleteMemberScheduleBlock,
} from "@/app/[clinic]/settings/team/actions";
import type { MemberWeeklySchedule, MemberScheduleBlock } from "@/types";

const DAY_NAMES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

interface SlotRow {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface ScheduleEditorProps {
  memberId: string;
  initialWeekly: MemberWeeklySchedule[];
  initialBlocks: MemberScheduleBlock[];
}

export function ScheduleEditor({
  memberId,
  initialWeekly,
  initialBlocks,
}: ScheduleEditorProps) {
  const router = useRouter();
  const { clinicSlug } = useClinic();

  const [slots, setSlots] = useState<SlotRow[]>(
    initialWeekly.map((s) => ({
      day_of_week: s.day_of_week,
      start_time: s.start_time.slice(0, 5),
      end_time: s.end_time.slice(0, 5),
    }))
  );
  const [blocks, setBlocks] = useState<MemberScheduleBlock[]>(initialBlocks);

  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [weeklyError, setWeeklyError] = useState<string | null>(null);
  const [weeklySaved, setWeeklySaved] = useState(false);

  const [blockStart, setBlockStart] = useState("");
  const [blockEnd, setBlockEnd] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [blockLoading, setBlockLoading] = useState(false);
  const [blockError, setBlockError] = useState<string | null>(null);

  function addSlot(day: number) {
    setSlots((prev) => [
      ...prev,
      { day_of_week: day, start_time: "09:00", end_time: "13:00" },
    ]);
  }

  function removeSlot(index: number) {
    setSlots((prev) => prev.filter((_, i) => i !== index));
  }

  function updateSlot(index: number, patch: Partial<SlotRow>) {
    setSlots((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...patch } : s))
    );
  }

  function copyMondayToWeekdays() {
    const monday = slots.filter((s) => s.day_of_week === 1);
    if (monday.length === 0) {
      setWeeklyError("Define primero el horario del lunes para copiarlo.");
      return;
    }
    setWeeklyError(null);
    const others = slots.filter(
      (s) => s.day_of_week < 1 || s.day_of_week > 5
    );
    const copied: SlotRow[] = [];
    for (let day = 1; day <= 5; day++) {
      for (const m of monday) {
        copied.push({ ...m, day_of_week: day });
      }
    }
    setSlots([...others, ...copied]);
  }

  async function saveWeekly() {
    setWeeklyError(null);
    setWeeklySaved(false);
    setWeeklyLoading(true);

    for (const s of slots) {
      if (s.start_time >= s.end_time) {
        setWeeklyError(
          `${DAY_NAMES[s.day_of_week]}: la hora de inicio debe ser menor a la de fin.`
        );
        setWeeklyLoading(false);
        return;
      }
    }

    const result = await replaceMemberWeeklySchedule(
      memberId,
      clinicSlug,
      slots.map((s) => ({
        day_of_week: s.day_of_week,
        start_time: `${s.start_time}:00`,
        end_time: `${s.end_time}:00`,
      }))
    );

    setWeeklyLoading(false);
    if (!result.success) {
      setWeeklyError(result.error);
      return;
    }

    setWeeklySaved(true);
    router.refresh();
  }

  async function addBlock() {
    setBlockError(null);
    if (!blockStart || !blockEnd) {
      setBlockError("Elige fecha de inicio y fin del bloqueo.");
      return;
    }
    if (blockStart > blockEnd) {
      setBlockError("La fecha de inicio debe ser anterior o igual a la de fin.");
      return;
    }

    setBlockLoading(true);
    const result = await addMemberScheduleBlock(memberId, clinicSlug, {
      start_date: blockStart,
      end_date: blockEnd,
      reason: blockReason.trim() || null,
    });
    setBlockLoading(false);

    if (!result.success) {
      setBlockError(result.error);
      return;
    }

    setBlockStart("");
    setBlockEnd("");
    setBlockReason("");
    router.refresh();
  }

  async function removeBlock(blockId: string) {
    const result = await deleteMemberScheduleBlock(
      blockId,
      memberId,
      clinicSlug
    );
    if (!result.success) {
      setBlockError(result.error);
      return;
    }
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Horario semanal
          </CardTitle>
          <CardDescription>
            Días y tramos en que este profesional atiende. Las citas fuera de
            estos tramos se rechazarán automáticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {weeklyError && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {weeklyError}
            </div>
          )}
          {weeklySaved && (
            <div className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary">
              Horario guardado.
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copyMondayToWeekdays}
            >
              <Copy className="size-4" />
              Copiar lunes a L-V
            </Button>
          </div>

          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6, 0].map((day) => {
              const daySlots = slots
                .map((s, i) => ({ ...s, index: i }))
                .filter((s) => s.day_of_week === day);
              return (
                <div
                  key={day}
                  className="rounded-md border border-border p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {DAY_NAMES[day]}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => addSlot(day)}
                      className="h-7 px-2"
                    >
                      <Plus className="size-4" />
                      Agregar tramo
                    </Button>
                  </div>
                  {daySlots.length === 0 && (
                    <p className="text-xs italic text-muted-foreground">
                      No atiende.
                    </p>
                  )}
                  {daySlots.map((s) => (
                    <div
                      key={s.index}
                      className="grid grid-cols-[1fr_1fr_auto] gap-2"
                    >
                      <Input
                        type="time"
                        value={s.start_time}
                        onChange={(e) =>
                          updateSlot(s.index, { start_time: e.target.value })
                        }
                      />
                      <Input
                        type="time"
                        value={s.end_time}
                        onChange={(e) =>
                          updateSlot(s.index, { end_time: e.target.value })
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeSlot(s.index)}
                        aria-label="Eliminar tramo"
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          <Button type="button" onClick={saveWeekly} disabled={weeklyLoading}>
            {weeklyLoading ? "Guardando..." : "Guardar horario"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Bloqueos puntuales
          </CardTitle>
          <CardDescription>
            Vacaciones, licencia, curso. Las citas en este rango se rechazan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {blockError && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {blockError}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="block_start">Desde</Label>
              <DatePicker
                id="block_start"
                value={blockStart}
                onChange={setBlockStart}
                placeholder="Fecha inicio"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="block_end">Hasta</Label>
              <DatePicker
                id="block_end"
                value={blockEnd}
                onChange={setBlockEnd}
                placeholder="Fecha fin"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="block_reason">Motivo (opcional)</Label>
            <Input
              id="block_reason"
              placeholder="Ej: vacaciones, curso, licencia"
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
            />
          </div>
          <Button type="button" onClick={addBlock} disabled={blockLoading}>
            <Plus className="size-4" />
            {blockLoading ? "Agregando..." : "Agregar bloqueo"}
          </Button>

          {blocks.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-xs font-medium text-muted-foreground">
                Bloqueos activos:
              </p>
              {blocks.map((b) => {
                // Usamos mediodía para evitar saltos por DST cuando el browser
                // interpreta un ISO date-only como UTC.
                const start = new Date(`${b.start_date}T12:00:00`);
                const end = new Date(`${b.end_date}T12:00:00`);
                const fmt = (d: Date) =>
                  d.toLocaleDateString("es-CL", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  });
                return (
                  <div
                    key={b.id}
                    className="flex items-start justify-between rounded-md border border-border bg-muted/30 p-2"
                  >
                    <div className="flex items-start gap-2 text-sm">
                      <CalendarIcon className="mt-0.5 size-4 text-muted-foreground" />
                      <div>
                        <p>
                          {fmt(start)} → {fmt(end)}
                        </p>
                        {b.reason && (
                          <p className="text-xs text-muted-foreground">
                            {b.reason}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeBlock(b.id)}
                      aria-label="Eliminar bloqueo"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
