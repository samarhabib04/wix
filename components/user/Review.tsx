
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { StarIcon } from 'lucide-react';

export interface ReviewData {
  id: string;
  buyerName: string;
  buyerAvatar?: string;
  rating: number;
  comment: string;
  createdAt: Date;
}

interface ReviewProps {
  review: ReviewData;
}

const Review: React.FC<ReviewProps> = ({ review }) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div className="border-b pb-4 mb-4 last:border-0">
      <div className="flex items-start">
        <Avatar className="h-10 w-10 mr-3">
          {review.buyerAvatar ? (
            <AvatarImage src={review.buyerAvatar} alt={review.buyerName} />
          ) : (
            <AvatarFallback className="bg-brand-light-green text-brand-dark-green">
              {getInitials(review.buyerName)}
            </AvatarFallback>
          )}
        </Avatar>
        <div className="flex-1">
          <div className="flex justify-between items-center mb-1">
            <span className="font-medium">{review.buyerName}</span>
            <span className="text-sm text-gray-500">
              {formatDistanceToNow(review.createdAt, { addSuffix: true })}
            </span>
          </div>
          <div className="flex mb-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <StarIcon
                key={index}
                className={`h-4 w-4 ${
                  index < review.rating
                    ? 'text-yellow-400 fill-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            ))}
          </div>
          <p className="text-gray-600">{review.comment}</p>
        </div>
      </div>
    </div>
  );
};

export default Review;
