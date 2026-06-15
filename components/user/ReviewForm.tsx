
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StarIcon } from 'lucide-react';

interface ReviewFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sellerId: string; // Changed from number to string to match UUID type
  onSubmit: (rating: number, comment: string) => Promise<boolean>;
}

const ReviewForm: React.FC<ReviewFormProps> = ({ open, onOpenChange, sellerId, onSubmit }) => {
  const [rating, setRating] = useState<number>(0);
  const [reviewText, setReviewText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  const handleRatingChange = (newRating: number) => {
    setRating(newRating);
  };
  
  const handleSubmit = async () => {
    if (rating === 0) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const success = await onSubmit(rating, reviewText);
      if (success) {
        // Reset form and close modal
        setRating(0);
        setReviewText('');
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error submitting review:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Leave a Review</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <div className="flex items-center justify-center space-x-1 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => handleRatingChange(star)}
                className="focus:outline-none"
                aria-label={`Rate ${star} stars out of 5`}
              >
                <StarIcon
                  className={`h-8 w-8 ${
                    rating >= star
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>
          <Textarea
            placeholder="Write your review (max 500 characters)"
            maxLength={500}
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            className="min-h-[100px]"
          />
          <p className="text-sm text-gray-500 mt-2 text-right">
            {reviewText.length}/500
          </p>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting || rating === 0}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Review'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewForm;
