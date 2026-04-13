"use client";

import { DeleteButton } from "@/components/clients/delete-button";
import { deleteRecord } from "../../actions";

interface RecordDeleteButtonProps {
  recordId: string;
  clinicSlug: string;
  clientId: string;
  petId: string;
}

export function RecordDeleteButton({
  recordId,
  clinicSlug,
  clientId,
  petId,
}: RecordDeleteButtonProps) {
  return (
    <DeleteButton
      label="Eliminar registro clínico"
      description="Se eliminará este registro clínico permanentemente. Esta acción no se puede deshacer."
      onDelete={() => deleteRecord(recordId, clinicSlug, clientId, petId)}
      redirectTo={`/${clinicSlug}/clients/${clientId}/pets/${petId}/records`}
    />
  );
}
