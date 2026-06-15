
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export const useReviewManagement = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const deleteReview = useMutation({
    mutationFn: async ({ reviewId, reviewType }: { reviewId: string; reviewType: 'user' | 'business' }) => {
      const tableName = reviewType === 'user' ? 'user_reviews' : 'business_reviews';
      
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', reviewId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buyer-reviews", user?.id] });
      toast({
        title: "Success",
        description: "Review deleted successfully",
        variant: "default"
      });
    },
    onError: (error) => {
      console.error('Error deleting review:', error);
      toast({
        title: "Error",
        description: "Failed to delete review. Please try again.",
        variant: "destructive"
      });
    }
  });

  const updateReview = useMutation({
    mutationFn: async ({ 
      reviewId, 
      reviewType, 
      rating, 
      comment 
    }: { 
      reviewId: string; 
      reviewType: 'user' | 'business'; 
      rating: number; 
      comment: string;
    }) => {
      const tableName = reviewType === 'user' ? 'user_reviews' : 'business_reviews';
      
      const { error } = await supabase
        .from(tableName)
        .update({ 
          rating, 
          comment: comment.trim() || null,
          status: 'pending' // Reset to pending when edited
        })
        .eq('id', reviewId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buyer-reviews", user?.id] });
      toast({
        title: "Success",
        description: "Review updated successfully. It will be reviewed again by our moderators.",
        variant: "default"
      });
    },
    onError: (error) => {
      console.error('Error updating review:', error);
      toast({
        title: "Error",
        description: "Failed to update review. Please try again.",
        variant: "destructive"
      });
    }
  });

  return {
    deleteReview,
    updateReview
  };
};
