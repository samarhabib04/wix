import React, { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/ui/loading-spinner';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  fallbackPath?: string;
}

/**
 * AuthGuard component that protects routes and redirects unauthenticated users
 * Includes support for ?next= parameter to redirect back after login
 * Optimized for speed - no unnecessary loading states
 */
const AuthGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  requiredRoles = [],
  fallbackPath = '/auth/login'
}) => {
  const { user, isLoading, role } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [maxWaitTimeReached, setMaxWaitTimeReached] = useState(false);

  useEffect(() => {
    // Maximum wait time of 3 seconds - prevent infinite loading
    const timeoutId = setTimeout(() => {
      setMaxWaitTimeReached(true);
    }, 3000);

    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    // Wait for auth to load (max 3 seconds)
    if (isLoading && !maxWaitTimeReached) {
      return;
    }

    // Redirect to login if not authenticated after max wait
    if (!user && maxWaitTimeReached) {
      const currentPath = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
      const loginUrl = `${fallbackPath}?next=${encodeURIComponent(currentPath)}`;
      router.replace(loginUrl);
      return;
    }

    // Check role requirements if specified
    if (requiredRoles.length > 0 && role !== null) {
      // Check if user has one of the required roles
      const hasRequiredRole = requiredRoles.some(requiredRole => {
        if (requiredRole === 'admin') return role === 'admin';
        return role === requiredRole;
      });

      if (!hasRequiredRole) {
        // Redirect to appropriate dashboard based on user role
        const redirectPath = getUserDashboardPath(role);
        router.replace(redirectPath);
        return;
      }
    }
  }, [user, isLoading, role, requiredRoles, pathname, searchParams, router, fallbackPath, maxWaitTimeReached]);

  // Show loading only briefly (max 3 seconds)
  if (isLoading && !maxWaitTimeReached) {
    return <LoadingSpinner fullPage label="Loading..." />;
  }

  // User is authenticated or max wait reached - render children
  // Trust that middleware and layout will handle any redirects
  return <>{children}</>;
};

/**
 * Get the appropriate dashboard path for a user role
 */
const getUserDashboardPath = (role?: string | null): string => {
  switch (role) {
    case 'buyer':
      return '/my-buyer-dashboard';
    case 'seller':
      return '/my-seller-dashboard';
    case 'business':
      return '/my-business-dashboard';
    case 'admin':
      return '/admin-dashboard';
    default:
      return '/';
  }
};

export default AuthGuard;
