'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import SuspensionMessage from '@/components/SuspensionMessage';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { supabase } from '@/lib/supabase/client';

export default function AccountSuspendedPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [suspensionData, setSuspensionData] = useState<{
    suspensionReason: string | null;
    suspendedAt: string | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSuspensionData = async () => {
      if (!user?.id) {
        // If no user, redirect to home
        router.push('/');
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('suspension_reason, suspended_at, is_suspended, status')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching suspension data:', error);
          setIsLoading(false);
          return;
        }

        // Check if user is actually suspended
        const isSuspended = profile.is_suspended === true || profile.status === 'suspended';
        
        if (!isSuspended) {
          // User is not suspended, redirect to their dashboard
          router.push('/');
          return;
        }

        setSuspensionData({
          suspensionReason: profile.suspension_reason || null,
          suspendedAt: profile.suspended_at || null,
        });
      } catch (error) {
        console.error('Error fetching suspension data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuspensionData();
  }, [user, router]);

  if (isLoading) {
    return <LoadingSpinner fullPage label="Loading..." />;
  }

  if (!suspensionData) {
    return null; // Will redirect
  }

  return (
    <SuspensionMessage
      suspensionReason={suspensionData.suspensionReason}
      suspendedAt={suspensionData.suspendedAt}
    />
  );
}
