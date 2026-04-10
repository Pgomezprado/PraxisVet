"use client";

import { deleteClient } from "../../actions";
import { DeleteButton } from "@/components/clients/delete-button";

interface ClientDetailActionsProps {
  clientId: string;
  clinicSlug: string;
}

export function ClientDetailActions({
  clientId,
  clinicSlug,
}: ClientDetailActionsProps) {
  return (
    <DeleteButton
      label="Eliminar cliente"
      description="Esta acci\u00f3n eliminar\u00e1 al cliente y todos sus datos asociados. Esta acci\u00f3n no se puede deshacer."
      onDelete={() => deleteClient(clientId, clinicSlug)}
      redirectTo={`/${clinicSlug}/clients`}
    />
  );
}
