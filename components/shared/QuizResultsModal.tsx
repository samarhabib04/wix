import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Award, Heart, Info, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { toast } from '@/hooks/use-toast';

interface QuizResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  breedMatches: any[];
  quizAnswers: any;
  createdAt: string;
}

const QuizResultsModal: React.FC<QuizResultsModalProps> = ({
  isOpen,
  onClose,
  breedMatches,
  quizAnswers,
  createdAt
}) => {
  const router = useRouter();
  const [breedImages, setBreedImages] = useState<Record<string, string>>({});
  const [imageLoadErrors, setImageLoadErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchBreedImages = async () => {
      if (!breedMatches || breedMatches.length === 0) return;

      try {
        const breedNames = breedMatches.map(breed => breed.breed);
        const { data, error } = await supabase
          .from('quiz_breeds')
          .select('breed, image_url')
          .in('breed', breedNames);

        if (error) {
          console.error('QuizResultsModal: Error fetching breed images:', error);
          return;
        }

        const imageMap: Record<string, string> = {};
        data?.forEach(breed => {
          if (breed.image_url && breed.image_url.trim() !== '') {
            imageMap[breed.breed] = breed.image_url;

          }
        });

        setBreedImages(imageMap);
      } catch (error) {
        console.error('QuizResultsModal: Error fetching breed images:', error);
      }
    };

    if (isOpen) {
      fetchBreedImages();
    }
  }, [isOpen, breedMatches]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Fallback images for breeds when no image is available from database
  const getFallbackImage = (index: number) => {
    const fallbackImages = [
      'https://images.unsplash.com/photo-1582562124811-c09040d0a901?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1535268647677-300dbf3d78d1?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1452378174528-3090a4bba7b2?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1441057206919-63d19fac2369?w=400&h=400&fit=crop'
    ];
    return fallbackImages[index % fallbackImages.length];
  };

  const getBreedImage = (breed: any, index: number) => {
    const breedName = breed.breed;
    
    // First priority: real image from Supabase database
    if (breedImages[breedName] && !imageLoadErrors[breedName]) {

      return breedImages[breedName];
    }
    
    // Fallback to provided image_url in breed data if Supabase image fails
    if (breed.image_url && breed.image_url !== '/placeholder.svg' && !imageLoadErrors[`${breedName}_provided`]) {

      return breed.image_url;
    }
    
    // Final fallback

    return getFallbackImage(index);
  };

  const handleImageError = (breedName: string, imageSource: 'supabase' | 'provided') => {
    const errorKey = imageSource === 'supabase' ? breedName : `${breedName}_provided`;
    setImageLoadErrors(prev => ({ ...prev, [errorKey]: true }));
  };

  const handleBrowseBreed = (breed: any) => {
    // Convert breed name to slug format (lowercase, replace spaces with hyphens)
    const slug = breed.breed.toLowerCase().replace(/\s+/g, '-');
    const isIsMixed = breed.breed_type === 'Mixed Breed';
    const path = isIsMixed ? `/mixed-breeds/${slug}` : `/breeds/${slug}`;
    router.push(path);
  };

  const getAnswerDisplay = (key: string, value: any) => {
    // Format quiz answer keys to be more readable
    const formatKey = (key: string) => {
      return key.replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .replace(/_/g, ' ');
    };

    // Format values to be more readable
    const formatValue = (value: any) => {
      if (Array.isArray(value)) {
        return value.join(', ');
      }
      if (typeof value === 'boolean') {
        return value ? 'Yes' : 'No';
      }
      if (typeof value === 'string') {
        return value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, ' ');
      }
      return String(value);
    };

    return {
      key: formatKey(key),
      value: formatValue(value)
    };
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Award className="h-5 w-5 text-brand-dark-green" />
            Quiz Results Details
          </DialogTitle>
          <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
            <Calendar className="h-4 w-4" />
            {formatDate(createdAt)}
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* Breed Matches Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Heart className="h-5 w-5 text-rose-500" />
              Your Breed Matches ({breedMatches.length})
            </h3>
            <div className="grid gap-4">
              {breedMatches.map((breed, index) => (
                <Card key={index} className="overflow-hidden">
                  <div className="flex flex-col sm:flex-row">
                    <div className="w-full sm:w-32 aspect-square flex-shrink-0">
                      <img 
                        src={getBreedImage(breed, index)}
                        alt={breed.breed || 'Breed match'}
                        className="w-full h-full object-cover aspect-square"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          const currentSrc = target.src;
                          
                          // Check which image source failed and mark it as error
                          if (breedImages[breed.breed] && currentSrc === breedImages[breed.breed]) {
                            handleImageError(breed.breed, 'supabase');
                          } else if (breed.image_url && currentSrc === breed.image_url) {
                            handleImageError(breed.breed, 'provided');
                          }
                          
                          // Set fallback image
                          target.src = getFallbackImage(index);
                        }}
                      />
                    </div>
                    <div className="flex-1 p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-lg">{breed.breed}</h4>
                          {index === 0 && (
                            <Badge variant="secondary" className="bg-brand-soft-green/20 text-brand-dark-green">
                              Top Match
                            </Badge>
                          )}
                        </div>
                        <Button 
                          onClick={() => handleBrowseBreed(breed)}
                          size="sm"
                          className="bg-brand-soft-green hover:bg-brand-dark-green text-white w-full sm:w-auto"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Browse {breed.breed}
                        </Button>
                      </div>
                      {breed.description && (
                        <p className="text-sm text-gray-600 mb-2">
                          {breed.description}
                        </p>
                      )}
                      {breed.compatibility_score && (
                        <div className="text-sm">
                          <span className="font-medium">Compatibility: </span>
                          <span className="text-brand-dark-green font-semibold">
                            {Math.round(breed.compatibility_score)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Quiz Answers Section */}
          {quizAnswers && Object.keys(quizAnswers).length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-500" />
                Your Quiz Answers
              </h3>
              <Card>
                <CardContent className="p-4">
                  <div className="grid gap-3">
                    {Object.entries(quizAnswers).map(([key, value]) => {
                      const { key: displayKey, value: displayValue } = getAnswerDisplay(key, value);
                      return (
                        <div key={key} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-2 border-b border-gray-100 last:border-b-0">
                          <div className="font-medium text-gray-700 sm:w-1/3">
                            {displayKey}:
                          </div>
                          <div className="text-gray-900 sm:w-2/3">
                            {displayValue}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuizResultsModal;
