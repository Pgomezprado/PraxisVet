import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin.server";
import { verifyKapsoSignature } from "@/lib/notifications/kapso/signature";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Endpoint webhook que recibe eventos de Kapso (mensajes inbound, status updates,
 * eventos de conversación). Se registra en https://app.kapso.ai > Webhooks
 * apuntando a `https://<tu-dominio>/api/webhooks/kapso` con el secret de
 * `KAPSO_WEBHOOK_SECRET`.
 *
 * Eventos que manejamos hoy:
 *   - whatsapp.message.received → marcar como inbound + intentar matchear cliente
 *   - whatsapp.message.sent / .delivered / .read → actualizar status del log existente
 *   - whatsapp.message.failed → marcar fallo + guardar error
 *
 * Eventos que ignoramos (200 OK silencioso por ahora):
 *   - whatsapp.conversation.* — útil más adelante para SLA y reportes.
 *   - whatsapp.phone_number.* — admin-level, no afecta a notificaciones.
 *   - workflow.execution.* — no usamos workflows de Kapso aún.
 */
type KapsoEvent = {
  type: string;
  data?: {
    message?: {
      id?: string;
      from?: string;
      to?: string;
      text?: { body?: string };
      timestamp?: string;
    };
    status?: string;
    error?: { code?: string; title?: string; message?: string };
  };
};

export async function POST(request: Request) {
  const secret = process.env.KAPSO_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[kapso-webhook] KAPSO_WEBHOOK_SECRET no está configurada");
    return NextResponse.json({ error: "server misconfigured" }, { status: 500 });
  }

  // Importante: leer raw body ANTES de parsearlo. La firma se calcula sobre
  // el string crudo; cualquier reserialización rompe la verificación.
  const rawBody = await request.text();
  const signature = request.headers.get("x-webhook-signature");

  if (!verifyKapsoSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  // Kapso puede enviar eventos individuales o batches (header X-Webhook-Batch=true).
  // El tipo viene en el header X-Webhook-Event; lo propagamos a cada evento del body.
  const headerEventType = request.headers.get("x-webhook-event");
  const isBatch = request.headers.get("x-webhook-batch") === "true";
  const events: KapsoEvent[] = (
    isBatch && Array.isArray(parsed) ? parsed : [parsed]
  ).map((e) => {
    const ev = (e ?? {}) as KapsoEvent;
    return { ...ev, type: ev.type ?? headerEventType ?? "" };
  });

  const supabase = createAdminClient();
  const results: Array<Record<string, unknown>> = [];
  for (const event of events) {
    results.push(await handleEvent(event, supabase));
  }
  return NextResponse.json(
    isBatch ? { ok: true, results } : results[0] ?? { ok: true },
  );
}

async function handleEvent(
  event: KapsoEvent,
  supabase: ReturnType<typeof createAdminClient>,
): Promise<Record<string, unknown>> {
  switch (event.type) {
    case "whatsapp.message.received": {
      const from = event.data?.message?.from;
      const messageId = event.data?.message?.id;
      const phoneE164 = from ? `+${from.replace(/[^0-9]/g, "")}` : null;

      // Intentar matchear al cliente por phone_e164. Si está, asociamos el log;
      // si no, lo registramos sin client_id (huérfano que el admin podrá ver).
      let orgId: string | null = null;
      let clientId: string | null = null;
      if (phoneE164) {
        const { data: client } = await supabase
          .from("clients")
          .select("id, org_id")
          .eq("phone_e164", phoneE164)
          .limit(1)
          .maybeSingle();
        if (client) {
          orgId = client.org_id;
          clientId = client.id;
        }
      }

      // Sin org_id no podemos insertar (NOT NULL). Loggeamos a consola y
      // respondemos 200 para que Kapso no reintente — el mensaje queda en su
      // dashboard de todas formas.
      if (!orgId) {
        console.warn(
          `[kapso-webhook] inbound sin match de cliente: from=${phoneE164} msg=${messageId}`,
        );
        return { ok: true, matched: false };
      }

      await supabase.from("notification_logs").insert({
        org_id: orgId,
        client_id: clientId,
        channel: "whatsapp",
        provider: "kapso",
        template: "_inbound_",
        status: "delivered",
        direction: "inbound",
        provider_message_id: messageId ?? null,
        phone_e164: phoneE164,
        payload: event as unknown as object,
      });

      return { ok: true, matched: true };
    }

    case "whatsapp.message.sent":
    case "whatsapp.message.delivered":
    case "whatsapp.message.read":
    case "whatsapp.message.failed": {
      const status = event.type.split(".").pop() as
        | "sent"
        | "delivered"
        | "read"
        | "failed";
      const messageId = event.data?.message?.id;
      if (!messageId) {
        return { ok: true, skipped: "no_message_id" };
      }

      const updates: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
      };
      if (status === "failed") {
        updates.error_code = event.data?.error?.code ?? null;
        updates.error_message =
          event.data?.error?.message ?? event.data?.error?.title ?? null;
      }

      // Update by provider_message_id; ignoramos si no encontramos el log
      // (puede ser un mensaje que no originamos desde nuestra app).
      await supabase
        .from("notification_logs")
        .update(updates)
        .eq("provider_message_id", messageId)
        .eq("provider", "kapso");

      return { ok: true };
    }

    default:
      // Eventos no manejados todavía. 200 OK para que Kapso no reintente.
      return { ok: true, ignored: event.type };
  }
}
