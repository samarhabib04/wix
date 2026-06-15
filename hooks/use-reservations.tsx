import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";

export interface Reservation {
  id: string;
  listing_id: string;
  puppy_collar_color: string | null;
  status: string;
  user_id: string | null;
  created_at: string;
}

export const useReservations = (listingId: string) => {
  return useQuery({
    queryKey: ['reservations', listingId],
    queryFn: async (): Promise<Reservation[]> => {
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .eq('listing_id', listingId)
        .in('status', ['pending', 'confirmed', 'completed']); // Active reservations

      if (error) {
        console.error('Error fetching reservations:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!listingId,
  });
};
