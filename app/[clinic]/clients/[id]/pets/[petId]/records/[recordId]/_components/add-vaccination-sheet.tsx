"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Syringe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { VaccinationForm } from "@/components/vaccinations/vaccination-form";
import type { CatalogVaccineGroup } from "@/lib/vaccines/catalog";
import type { OrganizationMember } from "@/types";

interface AddVaccinationSheetProps {
  petId: string;
  clientId: string;
  clinicSlug: string;
  recordId: string;
  recordDate: string;
  recordVetId: string | null;
  vets: Pick<OrganizationMember, "id" | "first_name" | "last_name">[];
  catalog: CatalogVaccineGroup[];
  defaultOpen?: boolean;
}

export function AddVaccinationSheet({
  petId,
  clientId,
  clinicSlug,
  recordId,
  recordDate,
  recordVetId,
  vets,
  catalog,
  defaultOpen = false,
}: AddVaccinationSheetProps) {
  const [open, setOpen] = useState(defaultOpen);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (defaultOpen) {
      router.replace(pathname);
    }
  }, [defaultOpen, router, pathname]);

  const returnPath = `/${clinicSlug}/clients/${clientId}/pets/${petId}/records/${recordId}`;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button size="sm" variant="outline">
            <Syringe className="size-4" data-icon="inline-start" />
            Agregar vacuna
          </Button>
        }
      />
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Registrar vacuna en esta consulta</SheetTitle>
          <SheetDescription>
            La vacuna quedará vinculada a la ficha clínica actual y aparecerá
            también en el historial general de vacunas de la mascota.
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-4">
          {/* key fuerza remount al cerrar/abrir para resetear el form */}
          <VaccinationForm
            key={open ? "open" : "closed"}
            petId={petId}
            clientId={clientId}
            vets={vets}
            catalog={catalog}
            returnPath={returnPath}
            defaultValues={{
              clinical_record_id: recordId,
              date_administered: recordDate,
              vet_id: recordVetId ?? undefined,
            }}
            onSuccess={() => setOpen(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
