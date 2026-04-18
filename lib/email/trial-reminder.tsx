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

type TrialReminderEmailProps = {
  orgName: string;
  inviteeName: string;
  daysLeft: number;
  upgradeUrl: string;
};

function TrialReminderEmail({
  orgName,
  inviteeName,
  daysLeft,
  upgradeUrl,
}: TrialReminderEmailProps) {
  const isUrgent = daysLeft <= 2;
  const headline = isUrgent
    ? `Quedan ${daysLeft} días de tu prueba`
    : `Te quedan ${daysLeft} días de prueba gratis`;

  const lede = isUrgent
    ? `Tu equipo en ${orgName} ya está cargando datos en PraxisVet. Para que no pierdas el acceso al agendar, facturar y ver las fichas clínicas, activemos tu plan antes de que termine la prueba.`
    : `En ${orgName} ya llevan unas semanas usando PraxisVet. Antes de que termine tu prueba, conversemos qué plan calza con el tamaño de tu equipo.`;

  return (
    <Html lang="es">
      <Head />
      <Preview>{headline}</Preview>
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
            <Text style={{ color: "#cbd5d0", fontSize: 18, fontWeight: 600 }}>
              {headline}
            </Text>
            <Text style={{ color: "#cbd5d0", fontSize: 16, lineHeight: 1.6 }}>
              {lede}
            </Text>
          </Section>

          <Section style={{ textAlign: "center", margin: "32px 0" }}>
            <Button
              href={upgradeUrl}
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
              Activar mi plan
            </Button>
          </Section>

          <Hr style={{ borderColor: "#1f2a22", margin: "24px 0" }} />

          <Text style={{ color: "#cbd5d0", fontSize: 14, lineHeight: 1.6 }}>
            ¿Dudas? Responde este correo y te contactamos por WhatsApp o
            coordinamos una llamada rápida.
          </Text>
          <Text style={{ color: "#6b7d72", fontSize: 13, marginTop: 16 }}>
            Si el botón no funciona, copia y pega este enlace:
            <br />
            <span style={{ color: "#22c55e", wordBreak: "break-all" }}>
              {upgradeUrl}
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

export async function sendTrialReminderEmail(params: {
  to: string;
  orgName: string;
  inviteeName: string;
  daysLeft: number;
  upgradeUrl: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "PraxisVet <no-reply@praxisvet.cl>";

  if (!apiKey) {
    throw new Error("[trial-reminder] RESEND_API_KEY no está definida.");
  }

  const resend = new Resend(apiKey);

  const subject =
    params.daysLeft <= 2
      ? `Quedan ${params.daysLeft} días de tu prueba en PraxisVet`
      : `Te quedan ${params.daysLeft} días de prueba gratis de PraxisVet`;

  const { data, error } = await resend.emails.send({
    from,
    to: params.to,
    subject,
    react: (
      <TrialReminderEmail
        orgName={params.orgName}
        inviteeName={params.inviteeName}
        daysLeft={params.daysLeft}
        upgradeUrl={params.upgradeUrl}
      />
    ),
  });

  if (error) {
    throw new Error(`[trial-reminder] Resend falló: ${error.message}`);
  }

  return data;
}
