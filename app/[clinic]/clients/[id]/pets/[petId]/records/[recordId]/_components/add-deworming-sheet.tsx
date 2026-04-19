"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Worm } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { DewormingForm } from "@/components/dewormings/deworming-form";
import type { OrganizationMember } from "@/types";

interface AddDewormingSheetProps {
  petId: string;
  clientId: string;
  clinicSlug: string;
  recordId: string;
  recordDate: string;
  recordVetId: string | null;
  vets: Pick<OrganizationMember, "id" | "first_name" | "last_name">[];
  defaultOpen?: boolean;
}

export function AddDewormingSheet({
  petId,
  clientId,
  clinicSlug,
  recordId,
  recordDate,
  recordVetId,
  vets,
  defaultOpen = false,
}: AddDewormingSheetProps) {
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
            <Worm className="size-4" data-icon="inline-start" />
            Agregar desparasitación
          </Button>
        }
      />
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Registrar desparasitación en esta consulta</SheetTitle>
          <SheetDescription>
            La desparasitación quedará vinculada a la ficha clínica actual y
            aparecerá también en el historial general de la mascota.
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-4">
          <DewormingForm
            key={open ? "open" : "closed"}
            petId={petId}
            clientId={clientId}
            vets={vets}
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
