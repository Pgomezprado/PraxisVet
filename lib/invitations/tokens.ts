import "server-only";
import { randomBytes, createHash } from "node:crypto";

/**
 * Genera un token raw (para URL) y su hash (para la DB).
 * El hash nunca vuelve al cliente; el raw nunca se persiste.
 */
export function generateInviteToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("base64url");
  const hash = createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

export function hashInviteToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export const INVITE_TTL_DAYS = 7;
