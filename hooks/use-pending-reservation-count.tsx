import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const usePendingReservationCount = () => {
  const { user, role } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);

  // Fetch pending reservations based on user role
  const { data, refetch } = useQuery({
    queryKey: ['pending-reservations', user?.id, role],
    queryFn: async () => {
      if (!user?.id || !role) return 0;

      try {
        if (role === 'seller') {
          // For sellers: Get their listing IDs first, then count pending reservations
          const { data: listings, error: listingsError } = await supabase
            .from('sale_listings')
            .select('id')
            .eq('seller_id', user.id);

          if (listingsError || !listings || listings.length === 0) {
            return 0;
          }

          const listingIds = listings.map(l => l.id);

          // Count reservations for seller's listings that need seller confirmation
          const { data: reservations, error } = await supabase
            .from('reservations')
            .select('id')
            .in('listing_id', listingIds)
            .eq('seller_confirmed', false)
            .in('status', ['awaiting_confirmation', 'pending', 'confirmed']);

          if (error) {
            console.error('Error fetching seller pending reservations:', error);
            return 0;
          }

          return reservations?.length || 0;
        } else if (role === 'buyer') {
          // For buyers: Count their reservations that need buyer confirmation
          const { data: reservations, error } = await supabase
            .from('reservations')
            .select('id, buyer_confirmed, status')
            .eq('user_id', user.id)
            .eq('buyer_confirmed', false)
            .in('status', ['awaiting_confirmation', 'pending', 'confirmed']);

          if (error) {
            console.error('Error fetching buyer pending reservations:', error);
            return 0;
          }

          return reservations?.length || 0;
        }

        return 0;
      } catch (error) {
        console.error('Error in usePendingReservationCount:', error);
        return 0;
      }
    },
    enabled: !!user?.id && !!role,
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  });

  useEffect(() => {
    if (data !== undefined) {
      setPendingCount(data);
    }
  }, [data]);

  // Subscribe to real-time reservation updates
  useEffect(() => {
    if (!user || !role) return;

    let channel: any;

    if (role === 'seller') {
      // Subscribe to reservations for seller's listings
      channel = supabase
        .channel(`seller-reservations:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'reservations',
          },
          () => {
            // Refetch when any reservation changes
            refetch();
          }
        )
        .subscribe();
    } else if (role === 'buyer') {
      // Subscribe to buyer's reservations
      channel = supabase
        .channel(`buyer-reservations:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'reservations',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            // Refetch when buyer's reservations change
            refetch();
          }
        )
        .subscribe();
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user, role, refetch]);

  return { pendingCount };
};
