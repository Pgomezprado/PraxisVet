import { getClient } from "../../actions";
import { ClientForm } from "@/components/clients/client-form";

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ clinic: string; id: string }>;
}) {
  const { id } = await params;

  const result = await getClient(id);

  if (!result.success) {
    return (
      <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
        {result.error}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <ClientForm client={result.data} />
    </div>
  );
}
