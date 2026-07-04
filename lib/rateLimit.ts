// lib/rateLimit.ts
// Lightweight in-memory per-IP rate limiter for the API routes. Protects your
// free LLM quota from casual abuse / spam.
//
// NOTE: on serverless (Vercel) each instance has its own memory, so this is
// best-effort (resets on cold start, not shared across instances). For strong,
// distributed limits use Upstash Redis (free tier) - see README. This still
// stops the common case: one person hammering your endpoints.

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 20; // per IP per window
const hits = new Map<string, { count: number; reset: number }>();

export interface RateResult {
  ok: boolean;
  retryAfter: number; // seconds
}

export function rateLimit(req: Request): RateResult {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local";

  const now = Date.now();
  const entry = hits.get(ip);

  if (!entry || now > entry.reset) {
    hits.set(ip, { count: 1, reset: now + WINDOW_MS });
    // opportunistic cleanup so the map can't grow unbounded
    if (hits.size > 5000) {
      for (const [k, v] of hits) if (now > v.reset) hits.delete(k);
    }
    return { ok: true, retryAfter: 0 };
  }

  entry.count++;
  if (entry.count > MAX_REQUESTS) {
    return { ok: false, retryAfter: Math.ceil((entry.reset - now) / 1000) };
  }
  return { ok: true, retryAfter: 0 };
}

/** Build a 429 response payload + headers when rate-limited. */
export function rateLimitResponse(retryAfter: number) {
  return {
    body: {
      error:
        "Terlalu banyak permintaan dari perangkatmu. Coba lagi sebentar lagi.",
    },
    init: {
      status: 429,
      headers: { "Retry-After": String(retryAfter) },
    },
  };
}
