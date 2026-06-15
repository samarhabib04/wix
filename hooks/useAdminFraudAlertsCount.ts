'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { isUnreviewedSuspiciousUser } from '@/lib/utils/fraud-utils';

/**
 * Hook to get count of fraud alerts (flagged users, messages, and reservations)
 */
export function useAdminFraudAlertsCount() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();

  const { data: count = 0 } = useQuery({
    queryKey: ['admin-fraud-alerts-count'],
    queryFn: async () => {
      if (!user || role !== 'admin') return 0;

      try {
        // Count flagged users, messages, and fraud logs (excluding reviewed items)
        // For users: only count those with is_suspicious: true OR flags array has items
        const { data: allUsers } = await supabase
          .from('user_profiles')
          .select('id, fraud_flags')
          .not('fraud_flags', 'is', null);
        
        // Filter to only count suspicious users (is_suspicious: true OR has flags) and exclude reviewed
        const unreviewedUsers = allUsers?.filter(user => isUnreviewedSuspiciousUser(user.fraud_flags)) || [];
        
        // For messages and fraud_logs, try to exclude reviewed items
        // If reviewed_at column doesn't exist yet, fall back to counting all items
        let messagesCount = 0;
        let logsCount = 0;
        
        try {
          const messagesResult = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('fraud_flag', true)
            .is('reviewed_at', null); // Exclude reviewed messages (if column exists)
          messagesCount = messagesResult.count || 0;
        } catch (error) {
          // If reviewed_at column doesn't exist, count all fraud-flagged messages
          const messagesResult = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('fraud_flag', true);
          messagesCount = messagesResult.count || 0;
        }
        
        try {
          const logsResult = await supabase
            .from('fraud_logs')
            .select('id', { count: 'exact', head: true })
            .is('reviewed_at', null); // Exclude reviewed logs (if column exists)
          logsCount = logsResult.count || 0;
        } catch (error) {
          // If reviewed_at column doesn't exist, count all fraud logs
          const logsResult = await supabase
            .from('fraud_logs')
            .select('id', { count: 'exact', head: true });
          logsCount = logsResult.count || 0;
        }

        const usersCountUnreviewed = unreviewedUsers.length;

        // Total count of all unreviewed fraud alerts
        return usersCountUnreviewed + messagesCount + logsCount;
      } catch (error) {
        console.error('Error fetching admin fraud alerts count:', error);
        return 0;
      }
    },
    enabled: !!user && role === 'admin',
    refetchInterval: 30000, // Refetch every 30 seconds as backup
  });

  // Set up realtime subscriptions for fraud-related changes
  useEffect(() => {
    if (!user || role !== 'admin') return;

    const channels = [
      supabase
        .channel('admin-fraud-users-badges')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_profiles',
          },
          () => {
            // Invalidate the query to trigger refetch
            queryClient.invalidateQueries({ queryKey: ['admin-fraud-alerts-count'] });
          }
        )
        .subscribe(),
      supabase
        .channel('admin-fraud-messages-badges')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: 'fraud_flag=eq.true',
          },
          () => {
            queryClient.invalidateQueries({ queryKey: ['admin-fraud-alerts-count'] });
          }
        )
        .subscribe(),
      supabase
        .channel('admin-fraud-logs-badges')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'fraud_logs',
          },
          () => {
            queryClient.invalidateQueries({ queryKey: ['admin-fraud-alerts-count'] });
          }
        )
        .subscribe(),
    ];

    return () => {
      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
  }, [user, role, queryClient]);

  return count;
}
