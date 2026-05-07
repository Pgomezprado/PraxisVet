import "server-only";

const KAPSO_BASE_URL = "https://api.kapso.ai";
const KAPSO_API_VERSION = "v24.0";

type KapsoTextMessage = {
  to: string;
  body: string;
};

type TemplateParam = {
  type: "text";
  parameter_name: string;
  text: string;
};

type KapsoTemplateMessage = {
  to: string;
  template: string;
  language: string;
  variables?: Record<string, string>;
};

export type KapsoSendResult =
  | { ok: true; messageId: string; raw: unknown }
  | { ok: false; error: string; status?: number; raw?: unknown };

type Env = {
  apiKey: string;
  phoneNumberId: string;
  dryRunTo: string | null;
};

function readEnv(): Env | { error: string } {
  const apiKey = process.env.KAPSO_API_KEY;
  const phoneNumberId = process.env.KAPSO_PHONE_NUMBER_ID;
  if (!apiKey) return { error: "KAPSO_API_KEY no está configurada." };
  if (!phoneNumberId) return { error: "KAPSO_PHONE_NUMBER_ID no está configurada." };
  return {
    apiKey,
    phoneNumberId,
    dryRunTo: process.env.WHATSAPP_DRY_RUN_TO ?? null,
  };
}

function normalizeRecipient(phoneE164: string, dryRunTo: string | null): string {
  // Kapso/Meta esperan el número sin "+" — solo dígitos.
  const target = dryRunTo ?? phoneE164;
  return target.replace(/[^0-9]/g, "");
}

async function postToKapso(env: Env, body: object): Promise<KapsoSendResult> {
  const url = `${KAPSO_BASE_URL}/meta/whatsapp/${KAPSO_API_VERSION}/${env.phoneNumberId}/messages`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "X-API-Key": env.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "fetch failed" };
  }

  let parsed: unknown = null;
  try {
    parsed = await response.json();
  } catch {
    // Algunos errores devuelven texto plano.
  }

  if (!response.ok) {
    const errMsg =
      (parsed as { error?: { message?: string } } | null)?.error?.message ??
      `HTTP ${response.status}`;
    return { ok: false, error: errMsg, status: response.status, raw: parsed };
  }

  const messageId =
    (parsed as { messages?: Array<{ id: string }> } | null)?.messages?.[0]?.id;
  if (!messageId) {
    return { ok: false, error: "Respuesta sin message id", raw: parsed };
  }

  return { ok: true, messageId, raw: parsed };
}

/**
 * Envía un mensaje de texto libre por Kapso.
 * SOLO funciona dentro de la ventana de 24h (cliente escribió primero).
 * Para iniciar conversación usa `sendTemplate`.
 */
export async function sendText(input: KapsoTextMessage): Promise<KapsoSendResult> {
  const env = readEnv();
  if ("error" in env) return { ok: false, error: env.error };

  return postToKapso(env, {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: normalizeRecipient(input.to, env.dryRunTo),
    type: "text",
    text: { body: input.body },
  });
}

/**
 * Envía un template aprobado por Meta. Único camino para iniciar conversación
 * en frío (recordatorios, confirmaciones, alertas).
 *
 * Las variables se mapean a `parameter_name` (named parameters) — el template
 * en Meta debe estar declarado con `{{nombre}}`, no posicionales.
 */
export async function sendTemplate(input: KapsoTemplateMessage): Promise<KapsoSendResult> {
  const env = readEnv();
  if ("error" in env) return { ok: false, error: env.error };

  const parameters: TemplateParam[] = Object.entries(input.variables ?? {}).map(
    ([parameter_name, text]) => ({ type: "text", parameter_name, text }),
  );

  return postToKapso(env, {
    messaging_product: "whatsapp",
    to: normalizeRecipient(input.to, env.dryRunTo),
    type: "template",
    template: {
      name: input.template,
      language: { code: input.language },
      ...(parameters.length > 0
        ? { components: [{ type: "body", parameters }] }
        : {}),
    },
  });
}
