/**
 * WSTG-CLNT-07 / DogQuest-2026-002 (Edge Functions only):
 * Browser calls to `*.supabase.co/functions/v1/*` — use this allowlist (not `*`).
 * Set ALLOWED_ORIGINS in Supabase Edge Function secrets (comma-separated) for extra preview URLs.
 *
 * PostgREST `/rest/v1/*` CORS is NOT controlled by this file. On Supabase Cloud you must set
 * an explicit allowlist: Dashboard → Project Settings → API → "CORS allowed origins" (comma-separated).
 * Do not leave a config that reflects arbitrary `Origin` (e.g. https://attacker.com). After changing,
 * retest: GET `/rest/v1/user_profiles` with `Origin: https://evil.example` must not echo that origin.
 */
export function corsHeadersForRequest(req: Request, methods = 'GET, POST, OPTIONS'): Record<string, string> {
  const origin = req.headers.get('Origin');
  const fromEnv = Deno.env.get('ALLOWED_ORIGINS')?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];
  const defaults = [
    'https://dogquest.ie',
    'https://www.dogquest.ie',
    'https://dog-quest-next-dev.vercel.app',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];
  const allowList = [...new Set([...defaults, ...fromEnv])];

  const base: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Max-Age': '86400',
  };

  // Server-to-server (e.g. Stripe webhooks) — no Origin; do not send wildcard
  if (!origin) {
    return base;
  }

  const allowed = allowList.some((o) => o === origin);
  const allowOrigin = allowed ? origin : allowList[0] ?? 'https://dogquest.ie';
  return {
    ...base,
    'Access-Control-Allow-Origin': allowOrigin,
  };
}
