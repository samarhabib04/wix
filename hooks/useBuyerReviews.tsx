
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface BuyerReview {
  id: string;
  rating: number;
  comment: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  target_name: string;
  target_type: 'user' | 'business';
  target_id: string;
  business_type?: string;
}

export const useBuyerReviews = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["buyer-reviews", user?.id],
    queryFn: async (): Promise<BuyerReview[]> => {
      if (!user?.id) return [];

      // Fetch user reviews
      const { data: userReviews, error: userError } = await supabase
        .from('user_reviews')
        .select(`
          id,
          rating,
          comment,
          status,
          created_at,
          reviewed_user_id,
          user_profiles!user_reviews_reviewed_user_id_fkey (
            first_name,
            last_name
          )
        `)
        .eq('reviewer_user_id', user.id)
        .order('created_at', { ascending: false });

      if (userError) {
        console.error('Error fetching user reviews:', userError);
        throw userError;
      }

      // Fetch business reviews
      const { data: businessReviews, error: businessError } = await supabase
        .from('business_reviews')
        .select(`
          id,
          rating,
          comment,
          status,
          created_at,
          business_id,
          business_name,
          business_type
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (businessError) {
        console.error('Error fetching business reviews:', businessError);
        throw businessError;
      }

      // Format user reviews
      const formattedUserReviews: BuyerReview[] = (userReviews || []).map((review: any) => {
        const targetUser = review.user_profiles;
        const targetName = targetUser 
          ? `${targetUser.first_name || ''} ${targetUser.last_name || ''}`.trim() || 'Anonymous User'
          : 'Anonymous User';

        return {
          id: review.id,
          rating: review.rating,
          comment: review.comment,
          status: review.status,
          created_at: review.created_at,
          target_name: targetName,
          target_type: 'user' as const,
          target_id: review.reviewed_user_id
        };
      });

      // Format business reviews
      const formattedBusinessReviews: BuyerReview[] = (businessReviews || []).map((review: any) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        status: review.status,
        created_at: review.created_at,
        target_name: review.business_name || 'Unknown Business',
        target_type: 'business' as const,
        target_id: review.business_id,
        business_type: review.business_type
      }));

      // Combine and sort by date
      const allReviews = [...formattedUserReviews, ...formattedBusinessReviews]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return allReviews;
    },
    enabled: !!user?.id
  });
};
