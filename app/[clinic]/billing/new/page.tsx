import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { InvoiceForm } from "@/components/billing/invoice-form";
import { getClients } from "../actions";
import { getAppointment } from "../../appointments/actions";
import { resolvePriceForPet } from "../../settings/services/actions";

export default async function NewInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ clinic: string }>;
  searchParams: Promise<{ appointment?: string; client?: string }>;
}) {
  const { clinic } = await params;
  const { appointment: appointmentId, client: clientId } = await searchParams;

  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", clinic)
    .single();

  if (!org) {
    return (
      <p className="text-sm text-muted-foreground">
        Organizacion no encontrada.
      </p>
    );
  }

  const clientsResult = await getClients(org.id);
  const clients = clientsResult.success ? clientsResult.data : [];

  let defaultClientId = clientId;
  let defaultAppointmentId: string | undefined;
  let defaultItems: {
    description: string;
    quantity: number;
    unit_price: number;
    item_type?: "service" | "product";
  }[] = [];
  let priceTierInfo:
    | { label: string; price: number; service_name: string }
    | undefined;
  let appointmentDeposit: number | null = null;

  if (appointmentId) {
    const appointmentResult = await getAppointment(appointmentId);
    if (appointmentResult.data) {
      const appt = appointmentResult.data;
      defaultClientId = appt.client_id;
      defaultAppointmentId = appt.id;
      appointmentDeposit = appt.deposit_amount;

      if (appt.service) {
        let unitPrice = Number(appt.service.price ?? 0);

        if (appt.service.category === "grooming" && appt.pet) {
          const resolved = await resolvePriceForPet(
            appt.service.id,
            appt.pet.id
          );
          if (resolved.success) {
            unitPrice = resolved.data.price;
            if (
              resolved.data.source === "tier" &&
              resolved.data.tier_label
            ) {
              priceTierInfo = {
                label: resolved.data.tier_label,
                price: resolved.data.price,
                service_name: appt.service.name,
              };
            }
          }
        }

        defaultItems = [
          {
            description: appt.service.name,
            quantity: 1,
            unit_price: unitPrice,
            item_type: "service" as const,
          },
        ];
      }
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/${clinic}/billing`}>
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nueva factura</h1>
          <p className="text-sm text-muted-foreground">
            Crea una nueva factura para un cliente.
          </p>
        </div>
      </div>

      <InvoiceForm
        clients={clients}
        defaultClientId={defaultClientId}
        defaultAppointmentId={defaultAppointmentId}
        defaultItems={defaultItems.length > 0 ? defaultItems : undefined}
        priceTierInfo={priceTierInfo}
        appointmentDeposit={appointmentDeposit}
      />
    </div>
  );
}
