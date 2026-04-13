import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TeamMemberForm } from "@/components/team/team-member-form";

export default async function NewTeamMemberPage({
  params,
}: {
  params: Promise<{ clinic: string }>;
}) {
  const { clinic } = await params;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/${clinic}/settings/team`}>
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nuevo miembro</h1>
          <p className="text-sm text-muted-foreground">
            Agrega un nuevo integrante a tu equipo.
          </p>
        </div>
      </div>

      <TeamMemberForm />
    </div>
  );
}
