/**
 * Rate limit in-memory para el bootstrap del portal del tutor.
 *
 * Limitación conocida: el estado vive en memoria del proceso. En entornos
 * serverless (cada función fría arranca con Map vacío) y en deploys con
 * múltiples instancias, los contadores no se comparten. Suficiente como
 * primera barrera contra abuso trivial; complementar con Supabase Auth
 * (que ya ratea magic-links a nivel de proveedor) y el audit log.
 */

const WINDOW_MS = 5 * 60 * 1000; // 5 minutos
const MAX_ATTEMPTS = 5;

type Bucket = {
  count: number;
  windowStart: number;
};

const buckets = new Map<string, Bucket>();

function key(ip: string, identifier: string): string {
  return `${ip}::${identifier.toLowerCase()}`;
}

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSeconds: number };

export function checkPortalRateLimit(
  ip: string,
  identifier: string
): RateLimitResult {
  const k = key(ip, identifier);
  const now = Date.now();
  const bucket = buckets.get(k);

  if (!bucket || now - bucket.windowStart > WINDOW_MS) {
    buckets.set(k, { count: 1, windowStart: now });
    return { ok: true };
  }

  if (bucket.count >= MAX_ATTEMPTS) {
    const retryAfterSeconds = Math.ceil(
      (WINDOW_MS - (now - bucket.windowStart)) / 1000
    );
    return { ok: false, retryAfterSeconds };
  }

  bucket.count += 1;
  return { ok: true };
}

export function clearPortalRateLimit(ip: string, identifier: string): void {
  buckets.delete(key(ip, identifier));
}

// Export para tests
export const _internals = { buckets, WINDOW_MS, MAX_ATTEMPTS };
