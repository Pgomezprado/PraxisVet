import { notFound } from "next/navigation";
import { getService } from "../../actions";
import { ServiceForm } from "@/components/services/service-form";
import { PriceTiersManager } from "@/components/services/price-tiers-manager";

export default async function EditServicePage({
  params,
}: {
  params: Promise<{ clinic: string; serviceId: string }>;
}) {
  const { clinic, serviceId } = await params;

  const result = await getService(serviceId);

  if (!result.success) {
    notFound();
  }

  const service = result.data;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <ServiceForm service={service} />
      {service.category === "grooming" && (
        <PriceTiersManager serviceId={service.id} clinicSlug={clinic} />
      )}
    </div>
  );
}
