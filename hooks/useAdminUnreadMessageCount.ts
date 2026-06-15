'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to get count of messages that need admin attention (fraud flagged)
 */
export function useAdminUnreadMessageCount() {
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
        const { count: messageCount, error } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('fraud_flag', true);

        if (error) {
          console.error('Error fetching admin unread message count:', error);
          return;
        }

        if (messageCount !== null) {
          setCount(messageCount);
        }
      } catch (error) {
        console.error('Error fetching admin unread message count:', error);
      }
    };

    fetchCount();

    // Set up realtime subscription for fraud flagged messages
    const channel = supabase
      .channel('admin-messages-badges')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: 'fraud_flag=eq.true',
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
