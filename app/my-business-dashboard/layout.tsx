'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/ui/loading-spinner';
import BusinessDashboardLayoutNext from '@/components/business-dashboard/BusinessDashboardLayoutNext';
import SuspensionMessage from '@/components/SuspensionMessage';
import { supabase } from '@/lib/supabase/client';

export default function BusinessDashboardLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, role } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [maxWaitTimeReached, setMaxWaitTimeReached] = useState(false);
  const [isSuspended, setIsSuspended] = useState(false);
  const [suspensionData, setSuspensionData] = useState<{
    suspensionReason: string | null;
    suspendedAt: string | null;
  } | null>(null);
  const [checkingSuspension, setCheckingSuspension] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // Maximum wait time of 5 seconds - give more time for auth to load
    const timeoutId = setTimeout(() => {
      setMaxWaitTimeReached(true);
    }, 5000);

    return () => clearTimeout(timeoutId);
  }, []);

  // Check suspension status
  useEffect(() => {
    const checkSuspension = async () => {
      if (!user?.id) {
        setCheckingSuspension(false);
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('is_suspended, status, suspension_reason, suspended_at')
          .eq('id', user.id)
          .single();

        if (error) {
          // If profile not found (PGRST116), user was deleted - redirect immediately
          if (error.code === 'PGRST116') {
            setCheckingSuspension(false);
            if (typeof window !== 'undefined' && !isRedirecting) {
              setIsRedirecting(true);
              // Clear storage and redirect immediately
              try {
                localStorage.clear();
                sessionStorage.clear();
              } catch (e) {
                // Ignore storage errors
              }
              // Force immediate redirect
              window.location.href = '/auth/login?error=account_deleted';
            }
            return;
          }
          console.error('Error checking suspension:', error);
          setCheckingSuspension(false);
          return;
        }

        const suspended = profile.is_suspended === true || profile.status === 'suspended';
        setIsSuspended(suspended);

        if (suspended) {
          setSuspensionData({
            suspensionReason: profile.suspension_reason || null,
            suspendedAt: profile.suspended_at || null,
          });
        }
      } catch (error) {
        console.error('Error checking suspension:', error);
      } finally {
        setCheckingSuspension(false);
      }
    };

    checkSuspension();
  }, [user?.id]);

  // Check if user profile exists when user is set but role is null (might be deleted)
  useEffect(() => {
    const checkUserProfile = async () => {
      // If user exists but role is null and we've waited, check if profile exists
      if (user && role === null && maxWaitTimeReached) {
        try {
          const { error: profileError } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('id', user.id)
            .single();
          
          // If profile not found, user was deleted - redirect immediately
          if (profileError?.code === 'PGRST116') {
            if (typeof window !== 'undefined' && !isRedirecting) {
              setIsRedirecting(true);
              try {
                localStorage.clear();
                sessionStorage.clear();
              } catch (e) {
                // Ignore storage errors
              }
              // Force immediate redirect - use href for more reliable navigation
              window.location.href = '/auth/login?error=account_deleted';
            }
            return;
          }
        } catch (error) {
          console.error('Error checking user profile:', error);
        }
      }
    };
    
    checkUserProfile();
  }, [user, role, maxWaitTimeReached]);

  useEffect(() => {
    // Wait for auth to load (max 5 seconds)
    if (isLoading && !maxWaitTimeReached) return;

    // Only redirect if we're absolutely sure user is not authenticated
    // Check if we're already on login page to prevent loops
    const isOnLoginPage = pathname.includes('/auth/login');
    const justCameFromLogin = typeof window !== 'undefined' && 
      (document.referrer?.includes('/auth/login') || sessionStorage.getItem('redirectingToLogin') === 'true');
    
    // Redirect to login if not authenticated after max wait AND not already redirecting
    if (!user && maxWaitTimeReached && !isOnLoginPage && !justCameFromLogin && !isRedirecting) {
      // Use window.location.replace for immediate redirect to prevent hanging
      if (typeof window !== 'undefined') {
        setIsRedirecting(true);
        const currentPath = pathname;
        window.location.href = `/auth/login?next=${encodeURIComponent(currentPath)}`;
      }
      return;
    }

    // STRICT: If role is loaded and user doesn't have business role
    if (user && role !== null && role !== 'business') {
      // Redirect to appropriate dashboard based on role
      if (role === 'buyer') {
        router.replace('/my-buyer-dashboard');
      } else if (role === 'seller') {
        router.replace('/my-seller-dashboard');
      } else if (role === 'admin') {
        router.replace('/admin-dashboard');
      } else {
        router.replace('/');
      }
      return;
    }
  }, [user, isLoading, role, router, pathname, maxWaitTimeReached]);

  // If redirecting, show nothing (redirect will happen)
  if (isRedirecting) {
    return <LoadingSpinner fullPage label="Redirecting to login..." />;
  }

  // Show loading while auth is loading (max 5 seconds) or checking suspension
  if ((isLoading && !maxWaitTimeReached) || checkingSuspension) {
    return <LoadingSpinner fullPage label="Loading dashboard..." />;
  }

  // If user is suspended, show suspension message
  if (user && isSuspended && suspensionData) {
    return (
      <SuspensionMessage
        suspensionReason={suspensionData.suspensionReason}
        suspendedAt={suspensionData.suspendedAt}
      />
    );
  }

  // If user exists, render dashboard (even if role is still loading)
  // If no user after max wait, the useEffect will handle redirect
  if (user) {
    return <BusinessDashboardLayoutNext>{children}</BusinessDashboardLayoutNext>;
  }

  // If no user and max wait reached, show loading while redirect happens
  if (maxWaitTimeReached && !user) {
    return <LoadingSpinner fullPage label="Redirecting to login..." />;
  }

  // Default: show loading
  return <LoadingSpinner fullPage label="Loading..." />;
}

