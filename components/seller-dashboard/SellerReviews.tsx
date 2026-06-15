import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Card, 
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Star, CheckCircle, Clock, XCircle } from "lucide-react";
import LoadingSpinner from "@/components/ui/loading-spinner";
import EmptyState from "@/components/ui/empty-state";
import { useReviewManagement } from "@/hooks/useReviewManagement";

interface Review {
  id: string;
  rating: number;
  comment: string;
  status: string;
  created_at: string;
  target_name?: string;
  target_type: 'user' | 'business';
  business_type?: string;
}

const StarRating = ({ rating, interactive = false, onRatingChange }: { 
  rating: number; 
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
}) => {
  const handleClick = (star: number) => {
    if (interactive && onRatingChange) {
      onRatingChange(star);
    }
  };

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-5 w-5 ${
            star <= rating
              ? 'fill-yellow-400 text-yellow-400'
              : 'text-gray-300'
          } ${interactive ? 'cursor-pointer hover:text-yellow-400' : ''}`}
          onClick={() => handleClick(star)}
        />
      ))}
    </div>
  );
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'approved':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'pending':
      return <Clock className="h-4 w-4 text-yellow-600" />;
    case 'rejected':
      return <XCircle className="h-4 w-4 text-red-600" />;
    default:
      return null;
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'approved':
      return 'Approved';
    case 'pending':
      return 'Pending Review';
    case 'rejected':
      return 'Rejected';
    default:
      return status;
  }
};


const SellerReviews = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("received");
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [editRating, setEditRating] = useState(0);
  const [editComment, setEditComment] = useState("");
  const { deleteReview, updateReview } = useReviewManagement();

  // Fetch reviews received (reviews about the seller from buyers)
  const { data: reviewsReceived = [], isLoading: loadingReceived } = useQuery({
    queryKey: ['seller-reviews-received', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Fetch user reviews where the seller is the target
      // @ts-ignore
      const { data: userReviews, error: userError } = await supabase
        .from('user_reviews')
        .select('*')
        .eq('target_user_id', user.id)
        .order('created_at', { ascending: false });

      if (userError) throw userError;

      return (userReviews || []).map(review => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        status: review.status,
        created_at: review.created_at,
        target_name: review.reviewer_name,
        target_type: 'user' as const,
      }));
    },
    enabled: !!user?.id,
  });

  // Fetch reviews given by the seller
  const { data: reviewsGiven = [], isLoading: loadingGiven } = useQuery({
    queryKey: ['seller-reviews-given', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Fetch user reviews written by this seller
      // @ts-ignore
      const { data: userReviews, error: userError } = await supabase
        .from('user_reviews')
        .select('*, user_profiles!user_reviews_target_user_id_fkey(first_name, last_name)')
        .eq('reviewer_id', user.id)
        .order('created_at', { ascending: false });

      if (userError) throw userError;

      // Fetch business reviews written by this seller
      const { data: businessReviews, error: businessError } = await supabase
        .from('business_reviews')
        .select('*, business_listings!inner(name, type)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (businessError) throw businessError;

      const formattedUserReviews = (userReviews || []).map(review => {
        const profile = review.user_profiles as any;
        return {
          id: review.id,
          rating: review.rating,
          comment: review.comment || '',
          status: review.status,
          created_at: review.created_at,
          target_name: profile ? `${profile.first_name} ${profile.last_name}`.trim() : 'Unknown User',
          target_type: 'user' as const,
        };
      });

      const formattedBusinessReviews = (businessReviews || []).map(review => {
        const business = review.business_listings as any;
        return {
          id: review.id,
          rating: review.rating,
          comment: review.comment || '',
          status: review.status,
          created_at: review.created_at,
          target_name: business?.name || 'Unknown Business',
          target_type: 'business' as const,
          business_type: business?.type,
        };
      });

      return [...formattedUserReviews, ...formattedBusinessReviews].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
    enabled: !!user?.id,
  });

  const handleEditReview = (review: Review) => {
    setEditingReview(review);
    setEditRating(review.rating);
    setEditComment(review.comment);
  };

  const handleSaveEdit = async () => {
    if (!editingReview) return;

    try {
      await updateReview.mutateAsync({
        reviewId: editingReview.id,
        reviewType: editingReview.target_type,
        rating: editRating,
        comment: editComment,
      });

      setEditingReview(null);
      toast({
        title: "Success",
        description: "Review updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update review",
        variant: "destructive",
      });
    }
  };

  const handleDeleteReview = async (reviewId: string, reviewType: 'user' | 'business') => {
    if (!confirm('Are you sure you want to delete this review?')) return;

    try {
      await deleteReview.mutateAsync({ reviewId, reviewType });
      toast({
        title: "Success",
        description: "Review deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete review",
        variant: "destructive",
      });
    }
  };

  // Calculate average rating
  const totalRating = reviewsReceived.reduce((sum, review) => sum + review.rating, 0);
  const averageRating = reviewsReceived.length > 0 ? 
    (totalRating / reviewsReceived.length).toFixed(1) : "0.0";
  
  // Count ratings by star
  const ratingCounts = [0, 0, 0, 0, 0]; // 1-5 stars
  reviewsReceived.forEach(review => {
    if (review.rating >= 1 && review.rating <= 5) {
      ratingCounts[review.rating - 1]++;
    }
  });

  const isLoading = loadingReceived || loadingGiven;

  if (isLoading) {
    return <LoadingSpinner fullPage label="Loading reviews..." />;
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-berkshire mb-1">My Reviews</h2>
        <p className="text-muted-foreground">
          Total Reviews: {reviewsReceived.length + reviewsGiven.length}
        </p>
      </div>

      <Tabs defaultValue="received" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="received">
            Reviews Received ({reviewsReceived.length})
          </TabsTrigger>
          <TabsTrigger value="given">
            Reviews Given ({reviewsGiven.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="received" className="mt-0">
          {reviewsReceived.length > 0 ? (
            <div className="space-y-4">
              {reviewsReceived.map((review) => (
                <Card key={review.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold">{review.target_name}</p>
                          {getStatusIcon(review.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {getStatusText(review.status)}
                        </p>
                      </div>
                      <div className="text-right">
                        <StarRating rating={review.rating} />
                        <p className="text-sm text-muted-foreground mt-1">
                          {new Date(review.created_at).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm mb-4">{review.comment}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              icon="star"
              title="No reviews received yet"
              description="Reviews from buyers will appear here once they leave feedback on your listings."
            />
          )}
        </TabsContent>

        <TabsContent value="given" className="mt-0">
          {reviewsGiven.length > 0 ? (
            <div className="space-y-4">
              {reviewsGiven.map((review) => (
                <Card key={review.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold">{review.target_name}</p>
                          {review.target_type === 'business' && review.business_type && (
                            <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">
                              {review.business_type}
                            </span>
                          )}
                          {getStatusIcon(review.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {getStatusText(review.status)} • {review.target_type === 'business' ? 'Business' : 'User'}
                        </p>
                      </div>
                      <div className="text-right">
                        <StarRating rating={review.rating} />
                        <p className="text-sm text-muted-foreground mt-1">
                          {new Date(review.created_at).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm mb-4">{review.comment}</p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditReview(review)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteReview(review.id, review.target_type)}
                      >
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              icon="star"
              title="No reviews given yet"
              description="Reviews you write for businesses or other users will appear here."
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Review Dialog */}
      <Dialog open={!!editingReview} onOpenChange={(open) => !open && setEditingReview(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Review</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Rating</Label>
              <StarRating 
                rating={editRating} 
                interactive 
                onRatingChange={setEditRating}
              />
            </div>
            <div>
              <Label htmlFor="edit-comment">Comment</Label>
              <Textarea
                id="edit-comment"
                value={editComment}
                onChange={(e) => setEditComment(e.target.value)}
                rows={4}
                placeholder="Share your experience..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingReview(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SellerReviews;
