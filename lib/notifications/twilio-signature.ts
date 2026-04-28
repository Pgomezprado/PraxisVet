import "server-only";
import crypto from "node:crypto";

/**
 * Valida la firma X-Twilio-Signature de un webhook inbound.
 *
 * Twilio firma `URL pública + cuerpo ordenado`:
 *   - Concatena la URL completa con los pares (key,value) del body ordenados
 *     alfabéticamente por key, sin separador.
 *   - Calcula HMAC-SHA1 con tu Auth Token como secret.
 *   - Lo envía en base64 en el header X-Twilio-Signature.
 *
 * Referencia: https://www.twilio.com/docs/usage/webhooks/webhooks-security
 */
export function validateTwilioSignature(opts: {
  authToken: string;
  signature: string | null;
  url: string;
  params: Record<string, string>;
}): boolean {
  if (!opts.signature) return false;

  const sortedKeys = Object.keys(opts.params).sort();
  let data = opts.url;
  for (const key of sortedKeys) {
    data += key + opts.params[key];
  }

  const expected = crypto
    .createHmac("sha1", opts.authToken)
    .update(Buffer.from(data, "utf-8"))
    .digest("base64");

  // Comparación constant-time para evitar timing attacks.
  const a = Buffer.from(expected);
  const b = Buffer.from(opts.signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Normaliza el `From` que llega de Twilio (`whatsapp:+569XXXXXXXX`) al
 * formato E.164 estándar (`+569XXXXXXXX`) usado en la columna `phone_e164`.
 */
export function extractE164FromWhatsApp(from: string | null): string | null {
  if (!from) return null;
  const trimmed = from.trim();
  const cleaned = trimmed.startsWith("whatsapp:")
    ? trimmed.slice("whatsapp:".length)
    : trimmed;
  // E.164 acepta + seguido de 8-15 dígitos.
  if (!/^\+[1-9]\d{7,14}$/.test(cleaned)) return null;
  return cleaned;
}
