import { ClientForm } from "@/components/clients/client-form";

export default async function NewClientPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <ClientForm />
    </div>
  );
}
