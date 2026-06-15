'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to get count of listings where both admin_approved = true AND is_published = true
 * across sale_listings, stud_listings, and showcase_listings
 */
export function useAdminPendingApprovalsCount() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();

  const { data: count = 0 } = useQuery({
    queryKey: ['admin-pending-approvals-count'],
    queryFn: async () => {
      if (!user || role !== 'admin') return 0;

      try {
        // Count all listings where both admin_approved = true AND is_published = true
        // Filter out deleted listings
        const [saleCount, studCount, showcaseCount] = await Promise.all([
          supabase
            .from('sale_listings')
            .select('id', { count: 'exact', head: true })
            .or('is_deleted.is.null,is_deleted.eq.false')
            .eq('admin_approved', true)
            .eq('is_published', true),
          supabase
            .from('stud_listings')
            .select('id', { count: 'exact', head: true })
            .or('is_deleted.is.null,is_deleted.eq.false')
            .eq('admin_approved', true)
            .eq('is_published', true),
          supabase
            .from('showcase_listings')
            .select('id', { count: 'exact', head: true })
            .or('is_deleted.is.null,is_deleted.eq.false')
            .eq('admin_approved', true)
            .eq('is_published', true),
        ]);

        const total = 
          (saleCount.count || 0) + 
          (studCount.count || 0) + 
          (showcaseCount.count || 0);

        return total;
      } catch (error) {
        console.error('Error fetching admin pending approvals count:', error);
        return 0;
      }
    },
    enabled: !!user && role === 'admin',
    refetchInterval: 30000, // Refetch every 30 seconds as backup
  });

  // Set up realtime subscriptions for listing changes
  useEffect(() => {
    if (!user || role !== 'admin') return;

    const channels = [
      supabase
        .channel('admin-pending-approvals-sale')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'sale_listings',
          },
          () => {
            queryClient.invalidateQueries({ queryKey: ['admin-pending-approvals-count'] });
          }
        )
        .subscribe(),
      supabase
        .channel('admin-pending-approvals-stud')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'stud_listings',
          },
          () => {
            queryClient.invalidateQueries({ queryKey: ['admin-pending-approvals-count'] });
          }
        )
        .subscribe(),
      supabase
        .channel('admin-pending-approvals-showcase')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'showcase_listings',
          },
          () => {
            queryClient.invalidateQueries({ queryKey: ['admin-pending-approvals-count'] });
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
