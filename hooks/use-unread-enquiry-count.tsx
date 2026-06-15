import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useUnreadEnquiryCount = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // First, fetch business listings for the user
  const { data: businessIds = [] } = useQuery({
    queryKey: ['business-listings-ids', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('business_listings')
        .select('id')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching business listings:', error);
        return [];
      }

      return data?.map(listing => listing.id) || [];
    },
    enabled: !!user,
  });

  // Count unread enquiries from both tables
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unread-enquiry-count', user?.id, businessIds],
    queryFn: async () => {
      if (!user || !businessIds || businessIds.length === 0) return 0;

      let totalCount = 0;

      // Count unread vet_partner_enquiries
      try {
        const { count: vetCount, error: vetError } = await supabase
          .from('vet_partner_enquiries' as any)
          .select('*', { count: 'exact', head: true })
          .in('business_id', businessIds)
          .eq('read', false);

        if (!vetError && vetCount !== null) {
          totalCount += vetCount;
        } else if (vetError) {
          console.error('Error counting vet partner enquiries:', vetError);
        }
      } catch (error) {
        console.error('Exception counting vet partner enquiries:', error);
      }

      // Count unread business_enquiries (may not exist, handle gracefully)
      try {
        const { count: busCount, error: busError } = await supabase
          .from('business_enquiries' as any)
          .select('*', { count: 'exact', head: true })
          .in('business_id', businessIds)
          .eq('read', false);

        if (!busError && busCount !== null) {
          totalCount += busCount;
        } else if (busError) {
          // Table might not exist, which is fine - continue
        }
      } catch {
        // Table might not exist, which is fine
      }

      return totalCount;
    },
    enabled: !!user && businessIds.length > 0,
    refetchInterval: 30000, // Refetch every 30 seconds as a fallback
  });

  // Set up real-time subscriptions for both enquiry tables
  useEffect(() => {
    if (!user || !businessIds || businessIds.length === 0) return;

    // Subscribe to vet_partner_enquiries table changes
    const vetEnquiriesChannel = supabase
      .channel(`vet-enquiries:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vet_partner_enquiries',
        },
        (payload) => {
          // Check if the enquiry belongs to one of the user's businesses
          const enquiryBusinessId = (payload.new as any)?.business_id || (payload.old as any)?.business_id;
          if (enquiryBusinessId && businessIds.includes(enquiryBusinessId)) {
            // Invalidate query to refetch count
            queryClient.invalidateQueries({ queryKey: ['unread-enquiry-count', user.id] });
          }
        }
      )
      .subscribe();

    // Subscribe to business_enquiries table changes (if table exists)
    const businessEnquiriesChannel = supabase
      .channel(`business-enquiries:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'business_enquiries',
        },
        (payload) => {
          // Check if the enquiry belongs to one of the user's businesses
          const enquiryBusinessId = (payload.new as any)?.business_id || (payload.old as any)?.business_id;
          if (enquiryBusinessId && businessIds.includes(enquiryBusinessId)) {
            // Invalidate query to refetch count
            queryClient.invalidateQueries({ queryKey: ['unread-enquiry-count', user.id] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(vetEnquiriesChannel);
      supabase.removeChannel(businessEnquiriesChannel);
    };
  }, [user, businessIds, queryClient]);

  return { unreadCount };
};
