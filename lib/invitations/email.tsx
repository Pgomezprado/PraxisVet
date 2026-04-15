import "server-only";
import { Resend } from "resend";
import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Button,
  Hr,
  Section,
  Preview,
} from "@react-email/components";

type InviteEmailProps = {
  orgName: string;
  inviteeName: string;
  roleLabel: string;
  acceptUrl: string;
  expiresInDays: number;
};

function InviteEmail({
  orgName,
  inviteeName,
  roleLabel,
  acceptUrl,
  expiresInDays,
}: InviteEmailProps) {
  return (
    <Html lang="es">
      <Head />
      <Preview>{`Te invitaron a ${orgName} en PraxisVet`}</Preview>
      <Body
        style={{
          backgroundColor: "#0a0f0c",
          fontFamily:
            "'Plus Jakarta Sans', -apple-system, system-ui, sans-serif",
          margin: 0,
          padding: "40px 0",
        }}
      >
        <Container
          style={{
            backgroundColor: "#111814",
            border: "1px solid #1f2a22",
            borderRadius: 12,
            maxWidth: 560,
            margin: "0 auto",
            padding: 32,
          }}
        >
          <Section>
            <Text
              style={{
                color: "#22c55e",
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: 1,
                textTransform: "uppercase",
                margin: 0,
              }}
            >
              PraxisVet
            </Text>
            <Heading
              style={{
                color: "#f0fdf4",
                fontSize: 24,
                fontWeight: 700,
                marginTop: 16,
                marginBottom: 8,
              }}
            >
              Hola {inviteeName},
            </Heading>
            <Text style={{ color: "#cbd5d0", fontSize: 16, lineHeight: 1.6 }}>
              Te invitaron a unirte a <strong>{orgName}</strong> en PraxisVet
              como <strong>{roleLabel}</strong>.
            </Text>
            <Text style={{ color: "#cbd5d0", fontSize: 16, lineHeight: 1.6 }}>
              Haz clic en el botón para crear tu contraseña y acceder a la
              clínica.
            </Text>
          </Section>

          <Section style={{ textAlign: "center", margin: "32px 0" }}>
            <Button
              href={acceptUrl}
              style={{
                backgroundColor: "#22c55e",
                color: "#0a0f0c",
                fontSize: 16,
                fontWeight: 600,
                padding: "14px 28px",
                borderRadius: 8,
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              Aceptar invitación
            </Button>
          </Section>

          <Hr style={{ borderColor: "#1f2a22", margin: "24px 0" }} />

          <Text style={{ color: "#6b7d72", fontSize: 13, lineHeight: 1.6 }}>
            Si el botón no funciona, copia y pega este enlace en tu navegador:
            <br />
            <span style={{ color: "#22c55e", wordBreak: "break-all" }}>
              {acceptUrl}
            </span>
          </Text>
          <Text style={{ color: "#6b7d72", fontSize: 13, marginTop: 16 }}>
            Este enlace expira en {expiresInDays} días. Si no esperabas esta
            invitación, puedes ignorar este correo.
          </Text>
        </Container>
        <Text
          style={{
            color: "#4b5d52",
            fontSize: 12,
            textAlign: "center",
            marginTop: 24,
          }}
        >
          PraxisVet · Software para clínicas veterinarias
        </Text>
      </Body>
    </Html>
  );
}

export async function sendInviteEmail(params: {
  to: string;
  orgName: string;
  inviteeName: string;
  roleLabel: string;
  acceptUrl: string;
  expiresInDays: number;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "PraxisVet <no-reply@praxisvet.cl>";

  if (!apiKey) {
    throw new Error("[invitations] RESEND_API_KEY no está definida.");
  }

  const resend = new Resend(apiKey);

  const { data, error } = await resend.emails.send({
    from,
    to: params.to,
    subject: `Te invitaron a ${params.orgName} en PraxisVet`,
    react: (
      <InviteEmail
        orgName={params.orgName}
        inviteeName={params.inviteeName}
        roleLabel={params.roleLabel}
        acceptUrl={params.acceptUrl}
        expiresInDays={params.expiresInDays}
      />
    ),
  });

  if (error) {
    throw new Error(`[invitations] Resend falló: ${error.message}`);
  }

  return data;
}
