'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/ui/loading-spinner';
import AdminDashboardLayoutNext from '@/components/admin-dashboard/AdminDashboardLayoutNext';
import SuspensionMessage from '@/components/SuspensionMessage';
import { supabase } from '@/lib/supabase/client';
import { safeAuthNextPath } from '@/lib/utils/auth-redirect';

export default function AdminDashboardLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, role } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [authTimedOut, setAuthTimedOut] = useState(false);
  const [cookieSessionOk, setCookieSessionOk] = useState(false);
  const [isSuspended, setIsSuspended] = useState(false);
  const [suspensionData, setSuspensionData] = useState<{
    suspensionReason: string | null;
    suspendedAt: string | null;
  } | null>(null);
  const [checkingSuspension, setCheckingSuspension] = useState(false);
  const loginRedirectStarted = useRef(false);

  useEffect(() => {
    const timeoutId = setTimeout(() => setAuthTimedOut(true), 15000);
    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (user || loginRedirectStarted.current) return;
    if (isLoading && !authTimedOut) return;
    if (pathname.includes('/auth/login')) return;

    let cancelled = false;

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;

      if (session?.user) {
        setCookieSessionOk(true);
        return;
      }

      if (loginRedirectStarted.current) return;
      loginRedirectStarted.current = true;
      const next = safeAuthNextPath(pathname);
      window.location.href = `/auth/login?next=${encodeURIComponent(next)}`;
    })();

    return () => {
      cancelled = true;
    };
  }, [user, isLoading, authTimedOut, pathname]);

  useEffect(() => {
    if (!user?.id) {
      setCheckingSuspension(false);
      return;
    }

    setCheckingSuspension(true);
    const checkSuspension = async () => {
      try {
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('is_suspended, status, suspension_reason, suspended_at')
          .eq('id', user.id)
          .maybeSingle();

        if (error || !profile) {
          return;
        }

        const suspended =
          profile.is_suspended === true || profile.status === 'suspended';
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
    if (user && role !== null && role !== 'admin') {
      if (role === 'seller') {
        router.replace('/my-seller-dashboard');
      } else if (role === 'buyer') {
        router.replace('/my-buyer-dashboard');
      } else if (role === 'business') {
        router.replace('/my-business-dashboard');
      } else {
        router.replace('/');
      }
    }
  }, [user, role, router]);

  const canRenderDashboard = Boolean(user) || cookieSessionOk;

  if (!canRenderDashboard && isLoading && !authTimedOut) {
    return <LoadingSpinner fullPage label="Loading admin dashboard..." />;
  }

  if (!canRenderDashboard && !authTimedOut) {
    return <LoadingSpinner fullPage label="Loading admin dashboard..." />;
  }

  if (!canRenderDashboard) {
    return <LoadingSpinner fullPage label="Redirecting to login..." />;
  }

  if (checkingSuspension && user) {
    return <LoadingSpinner fullPage label="Loading admin dashboard..." />;
  }

  if (user && isSuspended && suspensionData) {
    return (
      <SuspensionMessage
        suspensionReason={suspensionData.suspensionReason}
        suspendedAt={suspensionData.suspendedAt}
      />
    );
  }

  return <AdminDashboardLayoutNext>{children}</AdminDashboardLayoutNext>;
}
