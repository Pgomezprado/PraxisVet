import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verifica la firma HMAC-SHA256 del header `X-Webhook-Signature` de Kapso.
 *
 * Kapso firma el body raw (NO el body parseado y reserializado) con el secret
 * que nosotros le dimos al crear el webhook. Comparación timing-safe obligatoria
 * para evitar ataques de timing.
 *
 * @param rawBody — el cuerpo crudo de la request (string), tal como llegó.
 * @param signatureHeader — el valor del header `x-webhook-signature` (puede ser hex o `sha256=hex`).
 * @param secret — el `KAPSO_WEBHOOK_SECRET` configurado en env.
 * @returns true si la firma es válida.
 */
export function verifyKapsoSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  secret: string,
): boolean {
  if (!signatureHeader || !secret) return false;

  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");

  // Aceptar tanto "sha256=<hex>" como "<hex>" para tolerancia.
  const received = signatureHeader.startsWith("sha256=")
    ? signatureHeader.slice("sha256=".length)
    : signatureHeader;

  if (received.length !== expected.length) return false;

  try {
    return timingSafeEqual(Buffer.from(received, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}
