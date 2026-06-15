import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from './types';

/**
 * NextResponse.redirect() drops Set-Cookie headers from the middleware `next()` response.
 * Supabase refreshes the session in getUser(); those cookies must be copied onto redirects
 * or the browser never persists the session for the next request (→ stuck on /auth/login?next=).
 */
export function copySupabaseCookiesToResponse(
  from: NextResponse,
  to: NextResponse
): NextResponse {
  from.cookies.getAll().forEach((cookie) => {
    const { name, value, ...options } = cookie;
    to.cookies.set(name, value, options);
  });
  return to;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://sehzakutrlropprdcewu.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlaHpha3V0cmxyb3BwcmRjZXd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5MjA4OTEsImV4cCI6MjA2MTQ5Njg5MX0.Ufbtalt1Uw_YRbeev_3KKQ8AuxNCrmzuMPOQC9hko6Q",
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Avoid logic between createServerClient and getUser() (Supabase SSR requirement).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return {
    supabase,
    user,
    response: supabaseResponse,
  };
}

