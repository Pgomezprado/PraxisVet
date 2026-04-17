import { createClient } from "@/lib/supabase/server";
import type { Species, VaccineLifeStage } from "@/types";

export interface CatalogDoseOption {
  doseId: string;
  doseName: string;
  sequence: number;
  intervalDays: number;
}

export interface CatalogProtocolGroup {
  protocolId: string;
  protocolName: string;
  lifeStage: VaccineLifeStage;
  doses: CatalogDoseOption[];
}

export interface CatalogVaccineGroup {
  vaccineId: string;
  vaccineCode: string;
  vaccineName: string;
  protocols: CatalogProtocolGroup[];
}

/**
 * Trae el catálogo global de vacunas aplicable a una especie, agrupado por vacuna/protocolo/dosis.
 * Excluye las vacunas desactivadas por la clínica (organization_vaccine_preferences.is_disabled).
 */
export async function getVaccineCatalogForPet(
  species: Species,
  orgId: string
): Promise<CatalogVaccineGroup[]> {
  const supabase = await createClient();

  const { data: vaccines, error: vaccinesError } = await supabase
    .from("vaccines_catalog")
    .select("id, code, name, species, is_active")
    .eq("is_active", true)
    .contains("species", [species])
    .order("name");

  if (vaccinesError || !vaccines) return [];

  const vaccineIds = vaccines.map((v) => v.id);
  if (vaccineIds.length === 0) return [];

  const { data: disabled } = await supabase
    .from("organization_vaccine_preferences")
    .select("vaccine_id, is_disabled")
    .eq("org_id", orgId)
    .eq("is_disabled", true)
    .in("vaccine_id", vaccineIds);

  const disabledIds = new Set((disabled ?? []).map((d) => d.vaccine_id));

  const { data: protocols } = await supabase
    .from("vaccine_protocols")
    .select("id, vaccine_id, code, name, species, life_stage")
    .eq("species", species)
    .in("vaccine_id", vaccineIds)
    .order("life_stage");

  const protocolIds = (protocols ?? []).map((p) => p.id);

  const { data: doses } = protocolIds.length
    ? await supabase
        .from("vaccine_protocol_doses")
        .select("id, protocol_id, sequence, name, interval_days")
        .in("protocol_id", protocolIds)
        .order("sequence")
    : { data: [] };

  const dosesByProtocol = new Map<string, CatalogDoseOption[]>();
  for (const d of doses ?? []) {
    const arr = dosesByProtocol.get(d.protocol_id) ?? [];
    arr.push({
      doseId: d.id,
      doseName: d.name,
      sequence: d.sequence,
      intervalDays: d.interval_days,
    });
    dosesByProtocol.set(d.protocol_id, arr);
  }

  const protocolsByVaccine = new Map<string, CatalogProtocolGroup[]>();
  for (const p of protocols ?? []) {
    const arr = protocolsByVaccine.get(p.vaccine_id) ?? [];
    arr.push({
      protocolId: p.id,
      protocolName: p.name,
      lifeStage: p.life_stage as VaccineLifeStage,
      doses: dosesByProtocol.get(p.id) ?? [],
    });
    protocolsByVaccine.set(p.vaccine_id, arr);
  }

  return vaccines
    .filter((v) => !disabledIds.has(v.id))
    .map((v) => ({
      vaccineId: v.id,
      vaccineCode: v.code,
      vaccineName: v.name,
      protocols: protocolsByVaccine.get(v.id) ?? [],
    }));
}
