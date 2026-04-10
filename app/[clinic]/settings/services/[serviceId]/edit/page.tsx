import { notFound } from "next/navigation";
import { getService } from "../../actions";
import { ServiceForm } from "@/components/services/service-form";

export default async function EditServicePage({
  params,
}: {
  params: Promise<{ clinic: string; serviceId: string }>;
}) {
  const { serviceId } = await params;

  const result = await getService(serviceId);

  if (!result.success) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl">
      <ServiceForm service={result.data} />
    </div>
  );
}
