import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TeamMemberForm } from "@/components/team/team-member-form";
import { getTeamMember } from "../../actions";

export default async function EditTeamMemberPage({
  params,
}: {
  params: Promise<{ clinic: string; memberId: string }>;
}) {
  const { clinic, memberId } = await params;

  const result = await getTeamMember(memberId);

  if (!result.success) {
    notFound();
  }

  const member = result.data;
  const name =
    [member.first_name, member.last_name].filter(Boolean).join(" ") ||
    "Miembro";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/${clinic}/settings/team`}>
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Editar {name}</h1>
          <p className="text-sm text-muted-foreground">
            Modifica los datos y rol del miembro.
          </p>
        </div>
      </div>

      <TeamMemberForm member={member} />
    </div>
  );
}
