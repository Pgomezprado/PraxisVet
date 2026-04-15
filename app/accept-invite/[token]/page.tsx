import { findValidInvitationByToken } from "@/lib/invitations/service";
import { roleLabels } from "@/lib/validations/team-members";
import { AcceptInviteForm } from "@/components/invite/accept-invite-form";
import type { MemberRole } from "@/types";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function AcceptInvitePage({ params }: PageProps) {
  const { token } = await params;
  const invitation = await findValidInvitationByToken(token);

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            PraxisVet
          </p>
          <h1 className="mt-2 text-2xl font-bold">Aceptar invitación</h1>
        </div>

        {!invitation && (
          <InviteMessage
            tone="error"
            title="Invitación no encontrada"
            description="El enlace es inválido o ha sido eliminado. Pide al administrador que te envíe uno nuevo."
          />
        )}

        {invitation?.status === "expired" && (
          <InviteMessage
            tone="error"
            title="Invitación expirada"
            description="Este enlace ya caducó. Pide al administrador que te envíe uno nuevo."
          />
        )}

        {invitation?.status === "revoked" && (
          <InviteMessage
            tone="error"
            title="Invitación revocada"
            description="Esta invitación fue cancelada por el administrador."
          />
        )}

        {invitation?.status === "accepted" && (
          <InviteMessage
            tone="success"
            title="Invitación ya aceptada"
            description="Tu cuenta ya está activa. Inicia sesión para acceder."
          />
        )}

        {invitation?.status === "valid" && (
          <InviteFormWrapper
            token={token}
            invitation={invitation}
          />
        )}
      </div>
    </main>
  );
}

function InviteMessage({
  tone,
  title,
  description,
}: {
  tone: "error" | "success";
  title: string;
  description: string;
}) {
  const Icon = tone === "error" ? AlertTriangle : CheckCircle2;
  const color = tone === "error" ? "text-destructive" : "text-primary";
  return (
    <div className="rounded-xl border border-border bg-card p-6 text-center">
      <Icon className={`mx-auto mb-3 size-10 ${color}`} />
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

type InvitationShape = Awaited<ReturnType<typeof findValidInvitationByToken>>;

function InviteFormWrapper({
  token,
  invitation,
}: {
  token: string;
  invitation: NonNullable<InvitationShape>;
}) {
  // Supabase join devuelve array para relaciones 1:1 en .select con alias
  const member = Array.isArray(invitation.member)
    ? invitation.member[0]
    : invitation.member;
  const organization = Array.isArray(invitation.organization)
    ? invitation.organization[0]
    : invitation.organization;

  const fullName = [member?.first_name, member?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-5 space-y-1">
        <p className="text-sm text-muted-foreground">Hola {fullName || "equipo"},</p>
        <p className="text-sm">
          Te invitaron a unirte a{" "}
          <span className="font-semibold">{organization?.name}</span> como{" "}
          <span className="font-semibold text-primary">
            {roleLabels[member?.role as MemberRole]}
          </span>
          .
        </p>
        <p className="text-sm text-muted-foreground">
          Crea una contraseña para activar tu cuenta.
        </p>
      </div>
      <div className="mb-4 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
        Tu email: <span className="font-mono">{invitation.email}</span>
      </div>
      <AcceptInviteForm token={token} />
    </div>
  );
}
