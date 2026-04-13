import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NewTutorForm } from "@/components/clients/new-tutor-form";

export default async function NewClientPage({
  params,
}: {
  params: Promise<{ clinic: string }>;
}) {
  const { clinic } = await params;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/${clinic}/clients`}>
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Nuevo tutor y paciente
          </h1>
          <p className="text-sm text-muted-foreground">
            Registra un nuevo tutor con su primera mascota.
          </p>
        </div>
      </div>

      <NewTutorForm />
    </div>
  );
}
