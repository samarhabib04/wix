/**
 * Safe `next` paths for post-login redirects.
 * Avoids multi-kilobyte URLs (e.g. blog edit slugs) breaking navigation/cookies.
 */
export function safeAuthNextPath(pathname: string, maxLength = 512): string {
  if (!pathname || !pathname.startsWith('/')) {
    return '/admin-dashboard';
  }

  if (pathname.startsWith('/admin-dashboard/blog/edit')) {
    return '/admin-dashboard/blog';
  }

  if (pathname.length <= maxLength) {
    return pathname;
  }

  if (pathname.startsWith('/admin-dashboard')) {
    return '/admin-dashboard';
  }

  return pathname.slice(0, maxLength);
}

export function hasSupabaseAuthCookies(
  cookies: { name: string; value: string }[],
): boolean {
  return cookies.some(
    (c) =>
      c.name.includes('sb-') ||
      c.name.includes('supabase') ||
      c.name.includes('auth'),
  );
}
