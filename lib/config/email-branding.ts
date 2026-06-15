/**
 * Logos in HTML email must use a URL that returns image/* with real image bytes.
 * Prefer Supabase Storage public URLs when the live site is behind a password / coming-soon gate
 * (those pages return HTML, so /email/dog-quest-logo.jpg breaks in inboxes).
 *
 * Optional env: NEXT_PUBLIC_EMAIL_LOGO_URL, NEXT_PUBLIC_EMAIL_LOGO_WHITE_URL
 * Optional path override: NEXT_PUBLIC_EMAIL_LOGO_STORAGE_PATH (default email-branding/dog-quest-logo.jpg)
 */
const DEFAULT_SITE = 'https://dogquest.ie';
const DEFAULT_STORAGE_LOGO = 'email-branding/dog-quest-logo.jpg';
const DEFAULT_STORAGE_WHITE = 'email-branding/logo-white.png';

function siteBase(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE).replace(/\/$/, '');
}

function supabasePublicObjectUrl(objectPath: string): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  if (!base) return null;
  return `${base}/storage/v1/object/public/${objectPath}`;
}

/** Preferred for new templates (smaller JPEG). */
export function getEmailLogoUrl(): string {
  const override = process.env.NEXT_PUBLIC_EMAIL_LOGO_URL?.trim();
  if (override) return override.replace(/\/$/, '');

  const path =
    process.env.NEXT_PUBLIC_EMAIL_LOGO_STORAGE_PATH?.trim() || DEFAULT_STORAGE_LOGO;
  const fromStorage = supabasePublicObjectUrl(path);
  if (fromStorage) return fromStorage;

  return `${siteBase()}/email/dog-quest-logo.jpg`;
}

/** Legacy path still referenced by some transactional templates. */
export function getEmailLogoWhiteUrl(): string {
  const override = process.env.NEXT_PUBLIC_EMAIL_LOGO_WHITE_URL?.trim();
  if (override) return override.replace(/\/$/, '');

  const path =
    process.env.NEXT_PUBLIC_EMAIL_LOGO_WHITE_STORAGE_PATH?.trim() ||
    DEFAULT_STORAGE_WHITE;
  const fromStorage = supabasePublicObjectUrl(path);
  if (fromStorage) return fromStorage;

  return `${siteBase()}/logo-white.png`;
}
