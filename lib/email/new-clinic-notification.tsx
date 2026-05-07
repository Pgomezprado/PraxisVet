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

type NewClinicNotificationProps = {
  clinicName: string;
  slug: string;
  plan: string;
  adminName: string;
  adminEmail: string;
  adminPhone: string | null;
  clinicPhone: string | null;
  clinicAddress: string | null;
  createdAt: string;
  superadminUrl: string;
};

function NewClinicNotificationEmail({
  clinicName,
  slug,
  plan,
  adminName,
  adminEmail,
  adminPhone,
  clinicPhone,
  clinicAddress,
  createdAt,
  superadminUrl,
}: NewClinicNotificationProps) {
  return (
    <Html lang="es">
      <Head />
      <Preview>Nueva clínica registrada: {clinicName}</Preview>
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
              PraxisVet · Superadmin
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
              Nueva clínica registrada
            </Heading>
            <Text style={{ color: "#cbd5d0", fontSize: 16, lineHeight: 1.6 }}>
              <strong style={{ color: "#f0fdf4" }}>{clinicName}</strong> acaba
              de crear su cuenta en PraxisVet.
            </Text>
          </Section>

          <Section style={{ marginTop: 24 }}>
            <Row label="Clínica" value={clinicName} />
            <Row label="Slug" value={`/${slug}`} />
            <Row label="Plan" value={plan} />
            <Row label="Teléfono clínica" value={clinicPhone ?? "—"} />
            <Row label="Dirección" value={clinicAddress ?? "—"} />
            <Hr style={{ borderColor: "#1f2a22", margin: "16px 0" }} />
            <Row label="Admin" value={adminName} />
            <Row label="Email admin" value={adminEmail} />
            <Row label="Teléfono admin" value={adminPhone ?? "—"} />
            <Row label="Creada" value={createdAt} />
          </Section>

          <Section style={{ textAlign: "center", margin: "32px 0" }}>
            <Button
              href={superadminUrl}
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
              Ver en superadmin
            </Button>
          </Section>

          <Hr style={{ borderColor: "#1f2a22", margin: "24px 0" }} />

          <Text style={{ color: "#6b7d72", fontSize: 13, lineHeight: 1.6 }}>
            Si esta clínica no debería existir, puedes eliminarla desde la zona
            peligrosa del detalle de la organización.
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
          PraxisVet · Notificación interna
        </Text>
      </Body>
    </Html>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Text
      style={{
        color: "#cbd5d0",
        fontSize: 14,
        lineHeight: 1.6,
        margin: "4px 0",
      }}
    >
      <span style={{ color: "#6b7d72" }}>{label}: </span>
      <strong style={{ color: "#f0fdf4" }}>{value}</strong>
    </Text>
  );
}

export async function sendNewClinicNotificationEmail(params: {
  clinicName: string;
  slug: string;
  plan: string;
  adminName: string;
  adminEmail: string;
  adminPhone: string | null;
  clinicPhone: string | null;
  clinicAddress: string | null;
  createdAt: Date;
  orgId: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "PraxisVet <no-reply@praxisvet.cl>";
  const to =
    process.env.OWNER_NOTIFICATION_EMAIL || "gomezpablo.mayor@gmail.com";
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://praxisvet.cl";

  if (!apiKey) {
    throw new Error(
      "[new-clinic-notification] RESEND_API_KEY no está definida.",
    );
  }

  const resend = new Resend(apiKey);

  const formattedDate = new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Santiago",
  }).format(params.createdAt);

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject: `Nueva clínica en PraxisVet: ${params.clinicName}`,
    react: (
      <NewClinicNotificationEmail
        clinicName={params.clinicName}
        slug={params.slug}
        plan={params.plan}
        adminName={params.adminName}
        adminEmail={params.adminEmail}
        adminPhone={params.adminPhone}
        clinicPhone={params.clinicPhone}
        clinicAddress={params.clinicAddress}
        createdAt={formattedDate}
        superadminUrl={`${siteUrl}/superadmin/${params.orgId}`}
      />
    ),
  });

  if (error) {
    throw new Error(
      `[new-clinic-notification] Resend falló: ${error.message}`,
    );
  }

  return data;
}
