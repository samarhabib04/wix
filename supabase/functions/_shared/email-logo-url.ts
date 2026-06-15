/**
 * Email <img src> must return real image bytes. If the main site uses a password / “coming soon”
 * gate, URLs like https://dogquest.ie/email/... return HTML and the logo breaks in clients.
 *
 * Priority:
 * 1) EMAIL_LOGO_URL / EMAIL_LOGO_WHITE_URL (explicit override)
 * 2) Supabase Storage public object (same project as Edge — not blocked by Vercel gate)
 *    Path default: email-branding/dog-quest-logo.jpg (upload after migration 20260410130000)
 * 3) PUBLIC_SITE_URL + /email/... (fallback when storage file not used)
 */
const DEFAULT_STORAGE_OBJECT = "email-branding/dog-quest-logo.jpg";
const DEFAULT_STORAGE_WHITE = "email-branding/logo-white.png";

function supabasePublicObjectUrl(objectPath: string): string | null {
  const base = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/$/, "");
  if (!base) return null;
  return `${base}/storage/v1/object/public/${objectPath}`;
}

export function emailLogoUrl(): string {
  const explicit = Deno.env.get("EMAIL_LOGO_URL");
  if (explicit) return explicit;

  const storagePath = Deno.env.get("EMAIL_LOGO_STORAGE_PATH") ?? DEFAULT_STORAGE_OBJECT;
  const fromStorage = supabasePublicObjectUrl(storagePath);
  if (fromStorage) return fromStorage;

  const site = (Deno.env.get("PUBLIC_SITE_URL") || "https://dogquest.ie").replace(
    /\/$/,
    "",
  );
  return `${site}/email/dog-quest-logo.jpg`;
}

export function emailLogoWhiteUrl(): string {
  const explicit = Deno.env.get("EMAIL_LOGO_WHITE_URL");
  if (explicit) return explicit;

  const storagePath =
    Deno.env.get("EMAIL_LOGO_WHITE_STORAGE_PATH") ?? DEFAULT_STORAGE_WHITE;
  const fromStorage = supabasePublicObjectUrl(storagePath);
  if (fromStorage) return fromStorage;

  const site = (Deno.env.get("PUBLIC_SITE_URL") || "https://dogquest.ie").replace(
    /\/$/,
    "",
  );
  return `${site}/logo-white.png`;
}
