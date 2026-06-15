'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/ui/loading-spinner';
import BuyerDashboardLayoutNext from '@/components/buyer-dashboard/BuyerDashboardLayoutNext';
import SuspensionMessage from '@/components/SuspensionMessage';
import { supabase } from '@/lib/supabase/client';

export default function BuyerDashboardLayoutWrapper({
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
  const [likelyFromLogin, setLikelyFromLogin] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setLikelyFromLogin(
      document.referrer?.includes('/auth/login') ||
        sessionStorage.getItem('redirectingToLogin') === 'true'
    );
  }, []);

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
            if (typeof window !== 'undefined') {
              // Clear storage and redirect immediately
              try {
                localStorage.clear();
                sessionStorage.clear();
              } catch (e) {
                // Ignore storage errors
              }
              window.location.replace('/auth/login?error=account_deleted');
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

  useEffect(() => {
    // Wait for auth to load (max 5 seconds)
    if (isLoading && !maxWaitTimeReached) return;

    // Only redirect if we're absolutely sure user is not authenticated
    // Check if we're already on login page to prevent loops
    const isOnLoginPage = pathname.includes('/auth/login');
    const fromLogin =
      typeof window !== 'undefined' &&
      (document.referrer?.includes('/auth/login') ||
        sessionStorage.getItem('redirectingToLogin') === 'true');

    // Redirect to login if not authenticated after max wait AND not already redirecting
    if (!user && maxWaitTimeReached && !isOnLoginPage && !fromLogin) {
      const currentPath = pathname;
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('redirectingToLogin', 'true');
        setTimeout(() => sessionStorage.removeItem('redirectingToLogin'), 2000);
        window.location.href = `/auth/login?next=${encodeURIComponent(currentPath)}`;
      }
      return;
    }

    // STRICT: If role is loaded and user doesn't have buyer role
    if (user && role !== null && role !== 'buyer') {
      // Redirect to appropriate dashboard based on role
      if (role === 'seller') {
        router.replace('/my-seller-dashboard');
      } else if (role === 'business') {
        router.replace('/my-business-dashboard');
      } else if (role === 'admin') {
        router.replace('/admin-dashboard');
      } else {
        router.replace('/');
      }
      return;
    }
  }, [user, isLoading, role, router, pathname, maxWaitTimeReached]);

  // After login, client auth state can lag behind cookies — recover once before trapping the UI
  useEffect(() => {
    if (!maxWaitTimeReached || user || pathname.includes('/auth/login')) return;

    const tried = sessionStorage.getItem('buyer_dashboard_auth_recovery');
    if (tried === '1') return;

    let cancelled = false;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session?.user) {
        sessionStorage.setItem('buyer_dashboard_auth_recovery', '1');
        window.location.reload();
        return;
      }
      const { data: refreshed } = await supabase.auth.refreshSession();
      if (cancelled) return;
      if (refreshed.session?.user) {
        sessionStorage.setItem('buyer_dashboard_auth_recovery', '1');
        window.location.reload();
        return;
      }
      const fromLogin =
        typeof window !== 'undefined' &&
        (document.referrer?.includes('/auth/login') ||
          sessionStorage.getItem('redirectingToLogin') === 'true');
      if (fromLogin) {
        sessionStorage.removeItem('redirectingToLogin');
        window.location.href = `/auth/login?next=${encodeURIComponent(pathname)}`;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [maxWaitTimeReached, user, pathname]);

  useEffect(() => {
    if (user && typeof window !== 'undefined') {
      sessionStorage.removeItem('buyer_dashboard_auth_recovery');
    }
  }, [user]);

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
    return <BuyerDashboardLayoutNext>{children}</BuyerDashboardLayoutNext>;
  }

  // If no user and max wait reached, show loading while redirect / session recovery happens
  if (maxWaitTimeReached && !user) {
    return (
      <LoadingSpinner
        fullPage
        label={likelyFromLogin ? 'Finishing sign-in...' : 'Redirecting to login...'}
      />
    );
  }

  // Default: show loading
  return <LoadingSpinner fullPage label="Loading..." />;
}




























