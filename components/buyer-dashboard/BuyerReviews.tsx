
import React, { useState } from 'react';
import { Star, CheckCircle, XCircle, Clock, Pencil, Trash2, Building, User, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useBuyerReviews, BuyerReview } from '@/hooks/useBuyerReviews';
import { useReviewManagement } from '@/hooks/useReviewManagement';
import { useRouter } from 'next/navigation';

const BuyerReviews = () => {
  const { data: reviews = [], isLoading, error } = useBuyerReviews();
  const { deleteReview, updateReview } = useReviewManagement();
  const router = useRouter();
  
  const [editingReview, setEditingReview] = useState<BuyerReview | null>(null);
  const [editRating, setEditRating] = useState(0);
  const [editComment, setEditComment] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const renderStars = (rating: number, interactive = false, onRatingChange?: (rating: number) => void) => {
    const stars = [];
    
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star 
          key={i}
          className={`w-5 h-5 ${
            i <= rating 
              ? 'fill-amber-400 text-amber-400' 
              : 'text-amber-300'
          } ${interactive ? 'cursor-pointer hover:text-amber-500' : ''}`}
          onClick={interactive && onRatingChange ? () => onRatingChange(i) : undefined}
        />
      );
    }
    
    return <div className="flex">{stars}</div>;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-amber-600" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      default:
        return 'Pending Approval';
    }
  };

  const handleEditReview = (review: BuyerReview) => {
    setEditingReview(review);
    setEditRating(review.rating);
    setEditComment(review.comment || '');
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingReview || editRating === 0) return;

    updateReview.mutate({
      reviewId: editingReview.id,
      reviewType: editingReview.target_type,
      rating: editRating,
      comment: editComment
    });

    setIsEditDialogOpen(false);
    setEditingReview(null);
  };

  const handleDeleteReview = (review: BuyerReview) => {
    deleteReview.mutate({
      reviewId: review.id,
      reviewType: review.target_type
    });
  };

  const handleNavigateToProfile = (review: BuyerReview) => {
    if (review.target_type === 'user') {
      router.push(`/users/${review.target_id}`);
    } else if (review.target_type === 'business') {
      router.push(`/business/${review.target_id}`);
    }
  };

  const ReviewCard = ({ review }: { review: BuyerReview }) => (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          {review.target_type === 'business' ? (
            <Building className="w-4 h-4 text-blue-600" />
          ) : (
            <User className="w-4 h-4 text-green-600" />
          )}
          <button
            onClick={() => handleNavigateToProfile(review)}
            className="font-semibold text-left hover:text-brand-soft-green transition-colors duration-200 flex items-center gap-1 group"
          >
            {review.target_name}
            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          </button>
          {review.business_type && (
            <Badge variant="outline" className="text-xs">
              {review.business_type}
            </Badge>
          )}
        </div>
        <div className="flex items-center text-xs text-gray-500">
          {getStatusIcon(review.status)}
          <span className="ml-1">{getStatusText(review.status)}</span>
        </div>
      </div>
      
      <div className="flex items-center mb-2">
        {renderStars(review.rating)}
        <span className="text-sm text-gray-500 ml-2">
          {new Date(review.created_at).toLocaleDateString('en-US', {
            year: 'numeric', 
            month: 'short', 
            day: 'numeric'
          })}
        </span>
      </div>
      
      {review.comment && (
        <p className="text-gray-700 mb-3">{review.comment}</p>
      )}
      
      <div className="flex justify-end space-x-2">
        {review.status === 'pending' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEditReview(review)}
            className="flex items-center space-x-1"
          >
            <Pencil className="w-3 h-3" />
            <span>Edit</span>
          </Button>
        )}
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center space-x-1 text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-3 h-3" />
              <span>Delete</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Review</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this review? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => handleDeleteReview(review)}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-soft-green mx-auto"></div>
          <p className="text-gray-500 mt-2">Loading your reviews...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-10">
          <p className="text-red-500">Error loading reviews. Please try again later.</p>
        </div>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-10">
        <div className="mb-4">
          <Star className="mx-auto w-12 h-12 text-gray-300" />
        </div>
        <h3 className="text-xl font-semibold mb-2">No Reviews Yet</h3>
        <p className="text-gray-500 mb-4">
          You haven't submitted any reviews yet. Your reviews of services and businesses will appear here.
        </p>
        <Button 
          onClick={() => window.location.href = '/directory'}
          className="bg-brand-soft-green hover:bg-brand-dark-green text-white"
        >
          Browse Directory to Leave Reviews
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-gray-600">
          View and manage all the reviews you've submitted.
        </p>
        <Badge variant="outline">
          {reviews.length} Total Review{reviews.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <Tabs defaultValue="given" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="given" className="text-xs sm:text-sm">Reviews Given ({reviews.length})</TabsTrigger>
          <TabsTrigger value="received" className="text-xs sm:text-sm">Reviews Received (0)</TabsTrigger>
        </TabsList>
        
        <TabsContent value="given" className="space-y-4 mt-6">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </TabsContent>
        
        <TabsContent value="received" className="space-y-4 mt-6">
          <div className="text-center py-8">
            <Star className="mx-auto w-8 h-8 text-gray-300 mb-2" />
            <p className="text-gray-500">No reviews received yet</p>
            <p className="text-gray-500 text-sm mt-1">
              Reviews from other users will appear here when available.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Review Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Review</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Rating</Label>
              <div className="mt-2">
                {renderStars(editRating, true, setEditRating)}
              </div>
            </div>
            <div>
              <Label htmlFor="edit-comment">Comment</Label>
              <Textarea
                id="edit-comment"
                value={editComment}
                onChange={(e) => setEditComment(e.target.value)}
                placeholder="Write your review (optional)"
                maxLength={500}
                className="mt-2"
              />
              <p className="text-sm text-gray-500 mt-1 text-right">
                {editComment.length}/500
              </p>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={editRating === 0 || updateReview.isPending}
                className="bg-brand-soft-green hover:bg-brand-dark-green text-white"
              >
                {updateReview.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BuyerReviews;
