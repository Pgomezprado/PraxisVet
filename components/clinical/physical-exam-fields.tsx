"use client";

import type { UseFormRegister, FieldErrors } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ClinicalRecordInput } from "@/lib/validations/clinical-records";
import {
  MUCOUS_COLORS,
  EAR_INSPECTIONS,
  COUGH_REFLEXES,
  LYMPH_NODES,
  ABDOMINAL_PALPATIONS,
  CONSCIOUSNESS_LEVELS,
} from "@/lib/validations/physical-exam";

interface PhysicalExamFieldsProps {
  register: UseFormRegister<ClinicalRecordInput>;
  errors: FieldErrors<ClinicalRecordInput>;
  earInspection?: string;
}

const SELECT_PLACEHOLDER = "";

function labelCase(v: string) {
  return v.replace(/_/g, " ");
}

export function PhysicalExamFields({
  register,
  errors,
  earInspection,
}: PhysicalExamFieldsProps) {
  return (
    <div className="space-y-5">
      {/* Numéricos */}
      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Constantes fisiológicas
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="respiratory_rate">
              FR <span className="text-xs text-muted-foreground">(resp/min)</span>
            </Label>
            <Input
              id="respiratory_rate"
              type="number"
              min="0"
              placeholder="ej: 24"
              {...register("respiratory_rate")}
            />
            {errors.respiratory_rate && (
              <p className="text-sm text-destructive">
                {errors.respiratory_rate.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="capillary_refill_seconds">
              TLLC <span className="text-xs text-muted-foreground">(seg)</span>
            </Label>
            <Input
              id="capillary_refill_seconds"
              type="number"
              step="0.1"
              min="0"
              placeholder="ej: 1.5"
              {...register("capillary_refill_seconds")}
            />
            {errors.capillary_refill_seconds && (
              <p className="text-sm text-destructive">
                {errors.capillary_refill_seconds.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="skin_fold_seconds">
              PC{" "}
              <span className="text-xs text-muted-foreground">
                (pliegue cutáneo, seg)
              </span>
            </Label>
            <Input
              id="skin_fold_seconds"
              type="number"
              step="0.1"
              min="0"
              placeholder="ej: 1.0"
              {...register("skin_fold_seconds")}
            />
            {errors.skin_fold_seconds && (
              <p className="text-sm text-destructive">
                {errors.skin_fold_seconds.message}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Observacionales */}
      <div className="space-y-4">
        <p className="text-xs font-medium text-muted-foreground">
          Observaciones clínicas
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="pe_mucous_color">Coloración mucosas</Label>
            <Select
              id="pe_mucous_color"
              {...register("physical_exam.mucous_color")}
            >
              <option value={SELECT_PLACEHOLDER}>Sin registrar</option>
              {MUCOUS_COLORS.map((v) => (
                <option key={v} value={v} className="capitalize">
                  {v}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pe_consciousness">Estado de conciencia</Label>
            <Select
              id="pe_consciousness"
              {...register("physical_exam.consciousness")}
            >
              <option value={SELECT_PLACEHOLDER}>Sin registrar</option>
              {CONSCIOUSNESS_LEVELS.map((v) => (
                <option key={v} value={v} className="capitalize">
                  {v}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pe_cough">Reflejo tusígeno</Label>
            <div className="flex gap-4 pt-1">
              {COUGH_REFLEXES.map((v) => (
                <label
                  key={v}
                  className="flex items-center gap-2 text-sm capitalize"
                >
                  <input
                    type="radio"
                    value={v}
                    {...register("physical_exam.cough_reflex")}
                  />
                  {v}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pe_lymph">Linfonodos</Label>
            <Select
              id="pe_lymph"
              {...register("physical_exam.lymph_nodes")}
            >
              <option value={SELECT_PLACEHOLDER}>Sin registrar</option>
              {LYMPH_NODES.map((v) => (
                <option key={v} value={v} className="capitalize">
                  {labelCase(v)}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="pe_lymph_notes">Notas linfonodos (opcional)</Label>
          <Textarea
            id="pe_lymph_notes"
            placeholder="Describe hallazgos si amerita..."
            {...register("physical_exam.lymph_nodes_notes")}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="pe_ear">Inspección oídos</Label>
            <Select id="pe_ear" {...register("physical_exam.ear_inspection")}>
              <option value={SELECT_PLACEHOLDER}>Sin registrar</option>
              {EAR_INSPECTIONS.map((v) => (
                <option key={v} value={v} className="capitalize">
                  {v}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pe_abdominal">Palpación abdominal</Label>
            <Select
              id="pe_abdominal"
              {...register("physical_exam.abdominal_palpation")}
            >
              <option value={SELECT_PLACEHOLDER}>Sin registrar</option>
              {ABDOMINAL_PALPATIONS.map((v) => (
                <option key={v} value={v} className="capitalize">
                  {v}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {earInspection === "otro" && (
          <div className="space-y-2">
            <Label htmlFor="pe_ear_notes">Detalle oídos</Label>
            <Textarea
              id="pe_ear_notes"
              placeholder="Describe el hallazgo otológico..."
              {...register("physical_exam.ear_notes")}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="pe_abdominal_notes">
            Notas palpación abdominal (opcional)
          </Label>
          <Textarea
            id="pe_abdominal_notes"
            placeholder="Ubicación y carácter del hallazgo..."
            {...register("physical_exam.abdominal_palpation_notes")}
          />
        </div>
      </div>
    </div>
  );
}
