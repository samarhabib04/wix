'use client';

import { useState, useEffect, useCallback } from "react";
import { StarIcon, ThumbsUpIcon, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import AdminTablePagination from "@/components/admin-dashboard/AdminTablePagination";
import LoadingSpinner from "@/components/ui/loading-spinner";

// Define Review type
type Review = {
  id: string;
  rating: number;
  comment: string | null;
  reviewer_name: string;
  reviewer_email: string | null;
  created_at: string;
  liked?: boolean;
};

export default function BusinessReviewsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sortOption, setSortOption] = useState<string>("recent");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [businessIds, setBusinessIds] = useState<string[]>([]);
  const [businessListingsCount, setBusinessListingsCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Fetch all business listings for current user
  useEffect(() => {
    const fetchBusinessListings = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('business_listings')
          .select('id')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error fetching business listings:', error);
          toast({
            title: "Error",
            description: "Failed to load business information.",
            variant: "destructive"
          });
          setIsLoading(false);
          return;
        }

        if (data && data.length > 0) {
          const ids = data.map(listing => listing.id);
          setBusinessIds(ids);
          setBusinessListingsCount(ids.length);
        } else {
          setBusinessIds([]);
          setBusinessListingsCount(0);
          toast({
            title: "No Business Found",
            description: "You don't have any business listings. Please create one first.",
            variant: "destructive"
          });
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Exception fetching business listings:', error);
        setIsLoading(false);
      }
    };

    fetchBusinessListings();
  }, [user, toast]);

  // Fetch reviews from database for all business listings
  const fetchReviews = useCallback(async () => {
    if (!businessIds || businessIds.length === 0) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      // Fetch reviews for all business listings where business_id matches any of the user's businesses
      const { data, error } = await supabase
        .from('business_reviews')
        .select('*')
        .in('business_id', businessIds)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching reviews:', error);
        console.error('Business IDs used:', businessIds);
        toast({
          title: "Error",
          description: "Failed to load reviews.",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      // Transform data to match Review type
      const transformedReviews: Review[] = (data || []).map((review: any) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        reviewer_name: review.reviewer_name,
        reviewer_email: review.reviewer_email,
        created_at: review.created_at,
        liked: false
      }));

      setReviews(transformedReviews);
    } catch (error) {
      console.error('Exception fetching reviews:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [businessIds, toast]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Realtime subscription for reviews
  useEffect(() => {
    if (!businessIds || businessIds.length === 0) return;

    // Subscribe to changes for all business listings
    const channels = businessIds.map(businessId => {
      return supabase
        .channel(`business-reviews:${businessId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'business_reviews',
            filter: `business_id=eq.${businessId}`,
          },
          (payload) => {
            // Refetch reviews when a new review is added or updated
            fetchReviews();
          }
        )
        .subscribe();
    });

    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [businessIds, fetchReviews]);

  // Handler for liking a review (local state only for now)
  const toggleLike = (id: string) => {
    setReviews(
      reviews.map((review) =>
        review.id === id ? { ...review, liked: !review.liked } : review
      )
    );
  };

  // Handler for delete button click
  const handleDeleteClick = (reviewId: string) => {
    setReviewToDelete(reviewId);
    setDeleteDialogOpen(true);
  };

  // Handler for confirmed delete
  const handleDeleteConfirm = async () => {
    if (!reviewToDelete) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('business_reviews')
        .delete()
        .eq('id', reviewToDelete);

      if (error) {
        console.error('Error deleting review:', error);
        toast({
          title: "Error",
          description: "Failed to delete review. Please try again.",
          variant: "destructive"
        });
        setIsDeleting(false);
        return;
      }

      toast({
        title: "Success",
        description: "Review deleted successfully.",
        variant: "default"
      });

      // Remove from local state
      setReviews(reviews.filter(review => review.id !== reviewToDelete));
      
      // Close dialog and reset
      setDeleteDialogOpen(false);
      setReviewToDelete(null);
      
      // Reset to first page if current page becomes empty
      const remainingReviews = reviews.filter(review => review.id !== reviewToDelete);
      const totalPages = Math.ceil(remainingReviews.length / itemsPerPage);
      if (currentPage > totalPages && totalPages > 0) {
        setCurrentPage(totalPages);
      } else if (totalPages === 0) {
        setCurrentPage(1);
      }
    } catch (error) {
      console.error('Exception deleting review:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Sort reviews based on selected option
  const sortedReviews = [...reviews].sort((a, b) => {
    if (sortOption === "recent") {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    } else if (sortOption === "highest") {
      return b.rating - a.rating;
    } else if (sortOption === "lowest") {
      return a.rating - b.rating;
    }
    return 0;
  });

  // Pagination calculations
  const totalPages = Math.ceil(sortedReviews.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedReviews = sortedReviews.slice(startIndex, endIndex);

  // Reset to page 1 if current page is out of bounds
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);
  
  // Calculate average rating
  const averageRating =
    reviews.length > 0
      ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
      : "0.0";
  
  // Star display helper
  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <StarIcon
        key={i}
        className={`h-4 w-4 ${i < rating ? "fill-amber-400 text-amber-400" : "text-gray-300"}`}
      />
    ));
  };
  
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-12">
            <LoadingSpinner 
              size="lg" 
              label="Loading reviews..." 
              fullPage={false}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Reviews Summary Card */}
      <Card>
        <CardContent className="flex flex-col items-center p-6 sm:flex-row sm:justify-between">
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-4">
            <div className="flex items-center">
              <span className="mr-2 text-3xl font-bold">{averageRating}</span>
              <div className="flex">
                {renderStars(Math.round(parseFloat(averageRating)))}
              </div>
            </div>
            <div className="flex flex-col items-center gap-1 sm:items-start">
              <span className="text-muted-foreground">Based on {reviews.length} reviews</span>
              <span className="text-sm text-muted-foreground">Across {businessListingsCount} business {businessListingsCount === 1 ? 'listing' : 'listings'}</span>
            </div>
          </div>
          
          <Select value={sortOption} onValueChange={setSortOption}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="highest">Highest Rated</SelectItem>
              <SelectItem value="lowest">Lowest Rated</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
      
      {/* Engagement Prompt */}
      <Card className="border-brand-soft-green/30 bg-brand-light-green/10">
        <CardContent className="p-4">
          <p className="text-center font-medium text-brand-dark-green">
            Engage with your reviewers! Responding to reviews shows you value customer feedback and can improve your reputation.
          </p>
        </CardContent>
      </Card>
      
      {/* Reviews List */}
      <div className="space-y-4">
        {paginatedReviews.length > 0 ? (
          paginatedReviews.map((review) => (
            <Card key={review.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="border-b p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex">{renderStars(review.rating)}</div>
                      <span className="font-semibold">{review.rating}.0</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString('en-IE', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                  {review.comment && (
                    <p className="mt-2">{review.comment}</p>
                  )}
                  <div className="mt-2 space-y-1">
                    <p className="text-sm font-medium">{review.reviewer_name}</p>
                    {review.reviewer_email && (
                      <p className="text-sm text-muted-foreground">{review.reviewer_email}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between bg-gray-50 p-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDeleteClick(review.id)}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    Delete
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={review.liked ? "text-brand-soft-green" : ""}
                    onClick={() => toggleLike(review.id)}
                  >
                    <ThumbsUpIcon className="mr-1 h-4 w-4" />
                    {review.liked ? "Liked" : "Like"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="flex flex-col items-center p-6">
            <StarIcon className="h-16 w-16 text-muted-foreground/30" />
            <h3 className="mt-4 text-xl font-semibold">No reviews yet</h3>
            <p className="text-muted-foreground">
              You haven't received any reviews yet. Reviews will appear here once customers leave them.
            </p>
          </Card>
        )}
      </div>

      {/* Pagination */}
      {sortedReviews.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <AdminTablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={sortedReviews.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
              showItemsPerPage={true}
            />
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Review</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this review? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

