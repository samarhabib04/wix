import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";

export interface SellerReservationStats {
  totalReservations: number;
  successfulReservations: number;
}

export const useSellerReservations = (sellerId: string | undefined) => {
  return useQuery({
    queryKey: ['seller-reservations', sellerId],
    queryFn: async (): Promise<SellerReservationStats> => {
      if (!sellerId) {
        return { totalReservations: 0, successfulReservations: 0 };
      }

      const { data, error } = await supabase
        .from('reservations')
        .select(`
          id,
          status,
          sale_listings!inner(seller_id)
        `)
        .eq('sale_listings.seller_id', sellerId);

      if (error) {
        console.error('Error fetching seller reservations:', error);
        throw error;
      }

      const totalReservations = data?.length || 0;
      const successfulReservations = data?.filter(
        reservation => reservation.status === 'confirmed' || reservation.status === 'completed'
      ).length || 0;

      return {
        totalReservations,
        successfulReservations,
      };
    },
    enabled: !!sellerId,
  });
};
