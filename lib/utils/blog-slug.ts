export const BLOG_SLUG_MAX_LENGTH = 80;

/** Build a URL-safe blog slug capped at 80 chars plus a unique suffix. */
export function generateBlogSlug(title: string, uniqueSuffix?: string): string {
  let base = title
    .toLowerCase()
    .replace(/[^\w\s]/gi, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (base.length > BLOG_SLUG_MAX_LENGTH) {
    base = base.slice(0, BLOG_SLUG_MAX_LENGTH).replace(/-+$/, '');
  }

  if (!base) {
    base = 'post';
  }

  const suffix =
    uniqueSuffix ?? Math.random().toString(36).substring(2, 10);
  return `${base}-${suffix}`;
}

export function blogSlugSuffixFromPostId(postId: string): string {
  return postId.replace(/-/g, '').slice(0, 8);
}

const POST_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isPostUuid(value: string): boolean {
  return POST_UUID_REGEX.test(value);
}
