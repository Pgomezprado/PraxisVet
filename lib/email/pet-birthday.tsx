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

type PetBirthdayEmailProps = {
  clinicName: string;
  tutorName: string;
  petName: string;
  ageYears: number | null;
  portalUrl?: string;
};

function PetBirthdayEmail({
  clinicName,
  tutorName,
  petName,
  ageYears,
  portalUrl,
}: PetBirthdayEmailProps) {
  const ageLine =
    ageYears != null && ageYears > 0
      ? `${petName} cumple ${ageYears} año${ageYears === 1 ? "" : "s"} hoy.`
      : `${petName} está de cumpleaños hoy.`;

  return (
    <Html lang="es">
      <Head />
      <Preview>🎂 {petName} está de cumpleaños hoy</Preview>
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
          <Heading
            style={{
              color: "#d9f2e5",
              fontSize: 22,
              margin: "0 0 16px 0",
              fontWeight: 700,
            }}
          >
            🎂 ¡Feliz cumpleaños, {petName}!
          </Heading>

          <Text
            style={{
              color: "#b7c9be",
              fontSize: 15,
              lineHeight: 1.6,
              margin: "0 0 16px 0",
            }}
          >
            Hola {tutorName}, {ageLine} Desde {clinicName} queremos desearle un
            día lleno de mimos y paseos.
          </Text>

          <Text
            style={{
              color: "#b7c9be",
              fontSize: 15,
              lineHeight: 1.6,
              margin: "0 0 24px 0",
            }}
          >
            Si quieres regalarle un chequeo general de cumpleaños, estamos para
            ayudarte.
          </Text>

          {portalUrl && (
            <Section style={{ textAlign: "center", margin: "24px 0" }}>
              <Button
                href={portalUrl}
                style={{
                  backgroundColor: "#2f7a53",
                  color: "#ffffff",
                  padding: "12px 24px",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: "none",
                  display: "inline-block",
                }}
              >
                Ver ficha de {petName}
              </Button>
            </Section>
          )}

          <Hr
            style={{
              borderColor: "#1f2a22",
              margin: "24px 0",
            }}
          />

          <Text
            style={{
              color: "#7a8c81",
              fontSize: 12,
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            {clinicName} — enviado con cariño desde PraxisVet.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export async function sendPetBirthdayEmail(params: {
  to: string;
  clinicName: string;
  tutorName: string;
  petName: string;
  ageYears: number | null;
  portalUrl?: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "PraxisVet <no-reply@praxisvet.cl>";

  if (!apiKey) {
    throw new Error("[pet-birthday] RESEND_API_KEY no está definida.");
  }

  const resend = new Resend(apiKey);

  const { data, error } = await resend.emails.send({
    from,
    to: params.to,
    subject: `🎂 ${params.petName} está de cumpleaños hoy`,
    react: (
      <PetBirthdayEmail
        clinicName={params.clinicName}
        tutorName={params.tutorName}
        petName={params.petName}
        ageYears={params.ageYears}
        portalUrl={params.portalUrl}
      />
    ),
  });

  if (error) {
    throw new Error(`[pet-birthday] Resend falló: ${error.message}`);
  }

  return data;
}
