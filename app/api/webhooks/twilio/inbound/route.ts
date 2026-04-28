import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin.server";
import {
  extractE164FromWhatsApp,
  validateTwilioSignature,
} from "@/lib/notifications/twilio-signature";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook inbound de Twilio para mensajes WhatsApp entrantes.
 *
 * Excepción legítima a Server Actions: Twilio entrega POST con body
 * application/x-www-form-urlencoded firmado con HMAC-SHA1. La verificación
 * exige acceso a la URL pública exacta + body crudo ordenado.
 *
 * Funcionalidad v1: detectar palabras clave de baja (STOP/BAJA/...) y
 * desactivar `whatsapp_opt_in` del cliente cuyo `phone_e164` coincide.
 *
 * Configurar en Twilio Console → Messaging → Sandbox / Sender:
 *   "When a message comes in" → POST → https://<dominio>/api/webhooks/twilio/inbound
 */

const STOP_REGEX = /^(stop|baja|cancel|cancelar|salir|unsubscribe)\b/i;

const REPLY_STOP =
  "Has dejado de recibir recordatorios. Para reactivar contacta a tu clínica.";
const REPLY_INFO =
  "Este es un canal de notificaciones. Para cambios contacta a tu clínica.";

export async function POST(request: Request) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    return NextResponse.json(
      { error: "TWILIO_AUTH_TOKEN no configurado" },
      { status: 500 }
    );
  }

  // Twilio envía form-urlencoded. Necesitamos el cuerpo crudo y reconstruir
  // el objeto de params para la verificación de firma.
  const rawBody = await request.text();
  const params = Object.fromEntries(new URLSearchParams(rawBody));

  // URL pública exacta tal como Twilio la firma. Permite override por env
  // para entornos detrás de proxy/tunnel (ngrok, Vercel preview).
  const publicBase =
    process.env.TWILIO_WEBHOOK_PUBLIC_URL ?? originFromRequest(request);
  const url = `${publicBase.replace(/\/$/, "")}/api/webhooks/twilio/inbound`;

  const valid = validateTwilioSignature({
    authToken,
    signature: request.headers.get("x-twilio-signature"),
    url,
    params,
  });

  if (!valid) {
    return new NextResponse("forbidden", { status: 403 });
  }

  const fromE164 = extractE164FromWhatsApp(params.From ?? null);
  const body = (params.Body ?? "").trim();
  const isStop = STOP_REGEX.test(body);

  if (!fromE164) {
    // Sin teléfono normalizable no podemos hacer nada útil; respondemos info.
    return twiml(REPLY_INFO);
  }

  if (!isStop) {
    return twiml(REPLY_INFO);
  }

  // Match en clients y desactivación de opt-in. Usa service_role porque el
  // webhook no es un usuario autenticado y necesita atravesar RLS.
  const supabase = createAdminClient();

  const { data: matched } = await supabase
    .from("clients")
    .update({ whatsapp_opt_in: false })
    .eq("phone_e164", fromE164)
    .eq("whatsapp_opt_in", true)
    .select("id, org_id");

  // Logueamos cada match para auditoría. Si el número no estaba en la base
  // (ej: un test desde el sandbox de Twilio), no creamos log huérfano.
  if (matched && matched.length > 0) {
    const logs = matched.map((c) => ({
      org_id: c.org_id,
      client_id: c.id,
      channel: "whatsapp",
      template: "inbound_optout",
      status: "delivered",
      payload: { from: fromE164, body },
    }));
    await supabase.from("notification_logs").insert(logs);
  }

  return twiml(REPLY_STOP);
}

function twiml(message: string): NextResponse {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(
    message
  )}</Message></Response>`;
  return new NextResponse(xml, {
    status: 200,
    headers: { "content-type": "text/xml; charset=utf-8" },
  });
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function originFromRequest(request: Request): string {
  // Fallback: la URL del request. En Vercel esto refleja el dominio público.
  try {
    const u = new URL(request.url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return "";
  }
}
