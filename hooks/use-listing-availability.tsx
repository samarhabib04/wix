import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { calculateListingAvailability, AvailabilityResult } from '@/lib/utils/availability-utils';

/**
 * Hook to fetch and calculate real-time availability for a listing
 * Automatically refetches every 30 seconds to keep availability current
 */
export function useListingAvailability(listingId: string | undefined) {
    return useQuery<AvailabilityResult>({
        queryKey: ['listing-availability', listingId],
        queryFn: async () => {
            if (!listingId) {
                throw new Error('Listing ID is required');
            }

            // Fetch listing details
            const { data: listing, error: listingError } = await supabase
                .from('sale_listings')
                .select('id, male_count, female_count, puppy_details')
                .eq('id', listingId)
                .single();

            if (listingError) {
                console.error('Error fetching listing:', listingError);
                throw listingError;
            }

            // Fetch active reservations for this listing
            // Include all statuses that represent active reservations
            const { data: reservations, error: reservationsError } = await supabase
                .from('reservations')
                .select('*')
                .eq('listing_id', listingId)
                .in('status', ['pending', 'confirmed', 'completed', 'awaiting_confirmation', 'both_confirmed']);

            if (reservationsError) {
                console.error('Error fetching reservations:', reservationsError);
                throw reservationsError;
            }

            // Calculate and return availability
            // Cast puppy_details from Json to any[] | null
            const listingWithTypedPuppyDetails = {
                ...listing,
                puppy_details: Array.isArray(listing.puppy_details) ? listing.puppy_details : null
            };
            return calculateListingAvailability(listingWithTypedPuppyDetails, reservations);
        },
        enabled: !!listingId,
        refetchInterval: 30000, // Refresh every 30 seconds
        staleTime: 10000, // Consider data stale after 10 seconds
    });
}
