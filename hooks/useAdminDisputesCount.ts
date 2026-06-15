'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to get count of active disputes (pending or under review)
 */
export function useAdminDisputesCount() {
  const { user, role } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Only fetch for admin users
    if (!user || role !== 'admin') {
      setCount(0);
      return;
    }

    const fetchCount = async () => {
      try {
        // Count disputes that are pending or under review (not resolved)
        const { count: disputesCount, error } = await supabase
          .from('reservation_disputes')
          .select('id', { count: 'exact', head: true })
          .in('status', ['pending', 'under_review']);

        if (error) {
          console.error('Error fetching admin disputes count:', error);
          return;
        }

        if (disputesCount !== null) {
          setCount(disputesCount);
        }
      } catch (error) {
        console.error('Error fetching admin disputes count:', error);
      }
    };

    fetchCount();

    // Set up realtime subscription for disputes
    const channel = supabase
      .channel('admin-disputes-badges')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservation_disputes',
        },
        () => {
          fetchCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, role]);

  return count;
}
