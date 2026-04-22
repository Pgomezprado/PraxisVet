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

type PortalInvitationProps = {
  tutorName: string;
  orgName: string;
  portalUrl: string;
};

function PortalInvitationEmail({
  tutorName,
  orgName,
  portalUrl,
}: PortalInvitationProps) {
  return (
    <Html lang="es">
      <Head />
      <Preview>{orgName} te invita al portal de tutores</Preview>
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
              Hola {tutorName},
            </Heading>
            <Text style={{ color: "#cbd5d0", fontSize: 18, fontWeight: 600 }}>
              {orgName} te invita a revisar la ficha de tu mascota en línea
            </Text>
            <Text style={{ color: "#cbd5d0", fontSize: 16, lineHeight: 1.6 }}>
              Desde el portal del tutor puedes ver las próximas citas, el
              historial de vacunas y desparasitaciones, y solicitar nuevas
              citas sin llamar por teléfono.
            </Text>
            <Text style={{ color: "#cbd5d0", fontSize: 16, lineHeight: 1.6 }}>
              Haz clic en el botón para entrar con un enlace seguro. No
              necesitas crear contraseña.
            </Text>
          </Section>

          <Section style={{ textAlign: "center", margin: "32px 0" }}>
            <Button
              href={portalUrl}
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
              Entrar al portal
            </Button>
          </Section>

          <Hr style={{ borderColor: "#1f2a22", margin: "24px 0" }} />

          <Text style={{ color: "#cbd5d0", fontSize: 14, lineHeight: 1.6 }}>
            Por seguridad, el enlace expira en una hora. Si necesitas uno
            nuevo, pídele a {orgName} que te reenvíe la invitación.
          </Text>
          <Text style={{ color: "#6b7d72", fontSize: 13, marginTop: 16 }}>
            Si el botón no funciona, copia y pega este enlace:
            <br />
            <span style={{ color: "#22c55e", wordBreak: "break-all" }}>
              {portalUrl}
            </span>
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

export async function sendPortalInvitationEmail(params: {
  to: string;
  tutorName: string;
  orgName: string;
  portalUrl: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "PraxisVet <no-reply@praxisvet.cl>";

  if (!apiKey) {
    throw new Error("[portal-invitation] RESEND_API_KEY no está definida.");
  }

  const resend = new Resend(apiKey);

  const { data, error } = await resend.emails.send({
    from,
    to: params.to,
    subject: `${params.orgName} te invita al portal del tutor en PraxisVet`,
    react: (
      <PortalInvitationEmail
        tutorName={params.tutorName}
        orgName={params.orgName}
        portalUrl={params.portalUrl}
      />
    ),
  });

  if (error) {
    throw new Error(`[portal-invitation] Resend falló: ${error.message}`);
  }

  return data;
}
