import { copySupabaseCookiesToResponse, updateSession } from '@/lib/supabase/middleware';
import { safeAuthNextPath } from '@/lib/utils/auth-redirect';
import { NextResponse, type NextRequest } from 'next/server';

// Protected routes configuration
const PROTECTED_ROUTES: Record<string, { roles?: string[]; requireAuth: boolean }> = {
  '/my-buyer-dashboard': { roles: ['buyer'], requireAuth: true },
  '/my-seller-dashboard': { roles: ['seller'], requireAuth: true },
  '/my-business-dashboard': { roles: ['business'], requireAuth: true },
  '/admin': { roles: ['admin'], requireAuth: true },
  '/admin-dashboard': { roles: ['admin'], requireAuth: true },
  // /add-listing is just a redirect page, let it through and let the destination handle auth
  '/add-sale-listing': { roles: ['seller'], requireAuth: true },
  '/add-stud-listing': { roles: ['seller'], requireAuth: true },
  '/add-showcase-listing': { roles: ['seller'], requireAuth: true },
  '/boost-listing': { roles: ['seller'], requireAuth: true },
  '/seller-dashboard/create-listing': { roles: ['seller'], requireAuth: true },
  '/reserve': { roles: ['buyer', 'admin'], requireAuth: true },
  '/reservations': { roles: ['buyer', 'seller', 'admin'], requireAuth: true },
  '/messages': { roles: ['buyer', 'seller', 'admin'], requireAuth: true },
};

/** WSTG-ATHZ-02: no lenient “maybe loading” bypass for these — unauthenticated users always go to login. */
function requiresStrictUnauthenticatedRedirect(pathname: string): boolean {
  const strict = ['/messages', '/reserve', '/reservations'];
  return strict.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

function getRouteConfig(pathname: string) {
  // Check exact matches first
  if (PROTECTED_ROUTES[pathname]) {
    return PROTECTED_ROUTES[pathname];
  }
  
  // Check prefix matches for nested routes
  for (const [route, config] of Object.entries(PROTECTED_ROUTES)) {
    if (pathname.startsWith(route)) {
      return config;
    }
  }
  
  return null;
}

async function getUserRole(supabase: any, userId: string): Promise<string | null> {
  try {
    try {
      const { data: isAdmin, error: adminError } = await supabase.rpc('is_current_user_admin');
      if (!adminError && isAdmin === true) {
        return 'admin';
      }
    } catch {
      // RPC unavailable in edge — fall back to profile
    }

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role, is_admin')
      .eq('id', userId)
      .single();

    if (profileError?.code === 'PGRST116') {
      return null;
    }

    if (!profileError && profile) {
      if (profile.is_admin === true) return 'admin';
      if (profile.role === 'admin') return 'admin';
      if (profile.role) return profile.role;
    }

    return null;
  } catch (error) {
    console.error('Error fetching user role:', error);
    return null;
  }
}

async function checkUserSuspension(supabase: any, userId: string): Promise<boolean> {
  try {
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('is_suspended, status')
      .eq('id', userId)
      .single();
    
    if (error || !profile) {
      // If we can't check, allow through (client-side will handle it)
      return false;
    }
    
    // User is suspended if is_suspended is true OR status is 'suspended'
    return profile.is_suspended === true || profile.status === 'suspended';
  } catch (error) {
    console.error('Error checking user suspension:', error);
    // If check fails, allow through (client-side will handle it)
    return false;
  }
}

/** Only same-origin relative paths — prevents open redirects via ?next= */
function isSafeInternalNextPath(path: string): boolean {
  if (!path || typeof path !== 'string') return false;
  const p = path.trim();
  if (!p.startsWith('/') || p.startsWith('//')) return false;
  if (p.includes('://') || p.includes('\\')) return false;
  return true;
}

function getRedirectPath(role: string | null, isDashboardRoute: boolean = false, isProtectedRoute: boolean = false): string {
  if (!role) return '/auth/login';
  
  // Always redirect to user's correct dashboard based on their role
  // Never redirect to login if user is authenticated
  const roleDashboards: Record<string, string> = {
    buyer: '/my-buyer-dashboard',
    seller: '/my-seller-dashboard',
    business: '/my-business-dashboard',
    admin: '/admin-dashboard',
  };
  
  // For dashboard routes or protected routes, redirect to user's dashboard
  if (isDashboardRoute || isProtectedRoute) {
    return roleDashboards[role] || '/';
  }
  
  // Fallback: redirect to user's dashboard
  return roleDashboards[role] || '/';
}

/** Preserves Supabase Set-Cookie from updateSession() — plain NextResponse.redirect() drops them. */
function redirectWithSession(
  request: NextRequest,
  sessionResponse: NextResponse,
  to: string | URL
): NextResponse {
  const url = typeof to === 'string' ? new URL(to, request.url) : to;
  return copySupabaseCookiesToResponse(sessionResponse, NextResponse.redirect(url));
}

export async function middleware(request: NextRequest) {
  const { supabase, user, response } = await updateSession(request);
  
  const pathname = request.nextUrl.pathname;

  // Authenticated users must not stay on /auth/login (client router.replace can fail → blank page + stuck URL)
  if (pathname === '/auth/login' && user?.email_confirmed_at) {
    const nextParam = request.nextUrl.searchParams.get('next');
    if (nextParam) {
      const decoded = decodeURIComponent(nextParam);
      if (isSafeInternalNextPath(decoded)) {
        return redirectWithSession(request, response, safeAuthNextPath(decoded));
      }
    }
    try {
      const userRole = await getUserRole(supabase, user.id);
      if (userRole) {
        const dest = getRedirectPath(userRole, false, false);
        return redirectWithSession(request, response, dest);
      }
    } catch {
      // fall through to callback
    }
    return redirectWithSession(request, response, '/auth/callback');
  }

  /** WSTG-ATHZ: admin URLs must never use the “lenient” unauthenticated bypass used for other dashboards. */
  const isAdminPath =
    pathname.startsWith('/admin-dashboard') ||
    pathname === '/admin' ||
    pathname.startsWith('/admin/');
  
  // Check if this is a dashboard route for redirect path determination
  const isDashboardRoute = pathname.startsWith('/my-seller-dashboard') || 
                           pathname.startsWith('/my-buyer-dashboard') || 
                           pathname.startsWith('/my-business-dashboard') ||
                           pathname.startsWith('/admin-dashboard');
  
  // Check if this is a client-side navigation (has referer pointing to same origin)
  const referer = request.headers.get('referer');
  const isClientSideNav = referer && new URL(referer).origin === request.nextUrl.origin;
  
  const routeConfig = getRouteConfig(pathname);
  
  // If route is not protected, continue
  if (!routeConfig) {
    return response;
  }
  
  // Check authentication for protected routes
  // Only redirect to login if we're certain the user is not authenticated
  // If we can't determine auth status, let client-side handle it
  if (routeConfig.requireAuth) {
    if (!user) {
      if (isAdminPath) {
        // Same lenient handling as other dashboards — client layout enforces admin role.
        return response;
      }

      if (requiresStrictUnauthenticatedRedirect(pathname)) {
        const loginUrl = new URL('/auth/login', request.url);
        loginUrl.searchParams.set('next', pathname);
        return redirectWithSession(request, response, loginUrl);
      }

      // Check if there are any cookies at all - if yes, user might be authenticated
      const allCookies = request.cookies.getAll();
      const hasAnyCookies = allCookies.length > 0;
      
      // Check for Supabase auth cookies specifically
      const hasAuthCookies = allCookies.some(c => 
        c.name.includes('sb-') || 
        c.name.includes('supabase') ||
        c.name.startsWith('sb-') ||
        c.name.includes('auth')
      );
      
      // For dashboard routes or seller-related routes, be extra lenient
      const isSellerRoute = pathname.startsWith('/seller-dashboard') || 
                           pathname.startsWith('/add-') ||
                           pathname.startsWith('/boost-listing');
      
      if (isDashboardRoute || isSellerRoute) {
        // For dashboard routes, always allow through to let client-side handle auth
        // This prevents false redirects when session is being established or cookies are being set
        // Client-side layouts will handle authentication checks properly
        return response;
      }
      
      // For other protected routes, check for auth cookies
      if (!hasAuthCookies && !hasAnyCookies) {
        // No auth cookies at all, definitely not authenticated
        const loginUrl = new URL('/auth/login', request.url);
        loginUrl.searchParams.set('next', pathname);
        return redirectWithSession(request, response, loginUrl);
      }
      
      // Has cookies but user is null - might be loading, let client-side handle it
      // This prevents false redirects when session is being established
      return response;
    }
    
    // User is authenticated, check role if required
    if (routeConfig.roles && routeConfig.roles.length > 0) {
      try {
        const userRole = await getUserRole(supabase, user.id);
        
        // Admin: never allow when role cannot be resolved (prevents privilege bypass)
        if (!userRole) {
          if (isAdminPath) {
            // Role lookup can fail transiently under load — do not eject authenticated admins.
            return response;
          }
          return response;
        }
        
        // STRICT: Check if user has required role (no admin exception)
        // Admin can ONLY access admin routes, not other role routes
        if (!routeConfig.roles.includes(userRole)) {
          // Redirect to user's correct dashboard based on their role
          // Always redirect authenticated users to their dashboard, never to login
          const redirectPath = getRedirectPath(userRole, isDashboardRoute, true);
          return redirectWithSession(request, response, redirectPath);
        }
        
        // Check if user is suspended - block access to all dashboard routes
        const isSuspended = await checkUserSuspension(supabase, user.id);
        if (isSuspended && isDashboardRoute) {
          // Redirect suspended users to account-suspended page
          return redirectWithSession(request, response, '/account-suspended');
        }
      } catch (error) {
        console.error('Error checking user role in middleware:', error);
        if (isAdminPath) {
          return response;
        }
        return response;
      }
    }
  }
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

