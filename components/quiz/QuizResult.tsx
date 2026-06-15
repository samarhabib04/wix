
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dog, ListFilter, Shuffle, Star, Award, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Database } from '@/lib/supabase/types';
import ImageModal from './ImageModal';

type QuizBreed = Database['public']['Tables']['quiz_breeds']['Row'] & {
  score?: number;
  tier?: 'perfect' | 'tier1' | 'tier2';
};

interface QuizResultProps {
  matches: QuizBreed[];
  isLoggedIn: boolean;
  onSeeListings: (slug: string) => void;
  onBrowseBreeds: () => void;
  breedImages?: Record<string, string>;
  onRerollResults?: () => void;
}

// Helper function to convert breed name to slug
const createBreedSlug = (breedName: string): string => {
  return breedName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .trim();
};

const QuizResult: React.FC<QuizResultProps> = ({ 
  matches, 
  isLoggedIn, 
  onSeeListings, 
  onBrowseBreeds,
  breedImages = {},
  onRerollResults
}) => {
  const [selectedImage, setSelectedImage] = useState<{ url: string; breed: string } | null>(null);

  const handleImageClick = (imageUrl: string, breedName: string) => {
    setSelectedImage({ url: imageUrl, breed: breedName });
  };

  const closeModal = () => {
    setSelectedImage(null);
  };

  // Get tier display information
  const getTierInfo = (tier?: string) => {
    switch (tier) {
      case 'perfect':
        return { 
          badge: 'Perfect Match', 
          color: 'bg-green-100 text-green-800', 
          icon: Trophy 
        };
      case 'tier1':
        return { 
          badge: 'Excellent Match', 
          color: 'bg-blue-100 text-blue-800', 
          icon: Award 
        };
      case 'tier2':
        return { 
          badge: 'Good Match', 
          color: 'bg-yellow-100 text-yellow-800', 
          icon: Star 
        };
      default:
        return { 
          badge: 'Great Match', 
          color: 'bg-gray-100 text-gray-800', 
          icon: Star 
        };
    }
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

  const getBreedImage = (breed: QuizBreed, index: number) => {
    const breedName = breed.breed;
    
    // First priority: real image from Supabase database
    if (breedImages[breedName]) {

      return breedImages[breedName];
    }
    
    // Fallback to provided image_url in breed data
    if (breed.image_url && breed.image_url !== '/placeholder.svg') {

      return breed.image_url;
    }
    
    // Final fallback

    return getFallbackImage(index);
  };

  // If no matches were found, display a message
  if (!matches || matches.length === 0) {
    return (
      <div className="animate-fade-in">
        <ImageModal
          isOpen={!!selectedImage}
          onClose={closeModal}
          imageUrl={selectedImage?.url || ''}
          breedName={selectedImage?.breed || ''}
        />

        <Card className="overflow-hidden shadow-lg border-amber-100">
          <div className="bg-amber-50 p-6 text-center">
            <h3 className="text-2xl md:text-3xl font-medium text-amber-700 mb-2">
              No Perfect Matches Found
            </h3>
            <p className="text-amber-600 text-lg">
              We couldn't find dogs that match all your criteria. Try adjusting your preferences!
            </p>
          </div>
          <CardFooter className="flex flex-col sm:flex-row gap-3 bg-gray-50 p-4">
            <Button 
              onClick={onBrowseBreeds} 
              className="w-full sm:w-auto flex-1 bg-brand-soft-green hover:bg-brand-dark-green"
            >
              <ListFilter className="mr-2 h-5 w-5" />
              Browse All Breeds
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Get the top match
  const topMatch = matches[0];

  return (
    <div className="animate-fade-in">
      <ImageModal
        isOpen={!!selectedImage}
        onClose={closeModal}
        imageUrl={selectedImage?.url || ''}
        breedName={selectedImage?.breed || ''}
      />

      <Card className="overflow-hidden shadow-lg border-green-100">
        <div className="bg-brand-soft-green/20 p-6 text-center">
          <div className="mb-4">
            <div className="inline-flex items-center justify-center p-2 bg-brand-soft-green rounded-full">
              <Dog className="h-6 w-6 text-white" />
            </div>
          </div>
          <h3 className="text-2xl md:text-3xl font-medium text-brand-dark-green mb-2">
            It's a Match!
          </h3>
          <p className="text-brand-soft-green text-lg">
            Based on your lifestyle, we recommend:
          </p>
        </div>
        
        <CardContent className="pt-6 pb-4">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="md:w-1/2">
              <img 
                src={getBreedImage(topMatch, 0)}
                alt={topMatch.breed || 'Dog breed'}
                className="w-full h-64 object-cover rounded-lg shadow-md cursor-pointer hover:opacity-90 transition-opacity media-scroll-fix"
                onClick={() => handleImageClick(getBreedImage(topMatch, 0), topMatch.breed || 'Dog breed')}
                draggable={false}
              />
            </div>
            
            <div className="md:w-1/2">
              <div className="flex items-center gap-2 mb-3">
                <h4 className="text-2xl font-semibold text-gray-800">
                  {topMatch.breed || 'Perfect Match'}
                </h4>
                {(() => {
                  const tierInfo = getTierInfo(topMatch.tier);
                  const IconComponent = tierInfo.icon;
                  return (
                    <Badge className={`${tierInfo.color} flex items-center gap-1`}>
                      <IconComponent className="h-3 w-3" />
                      {tierInfo.badge}
                    </Badge>
                  );
                })()}
              </div>
              
              <p className="text-gray-600 mb-4">
                {topMatch.description || 'This breed matches your preferences and lifestyle.'}
              </p>
              
              <Button 
                onClick={() => {
                  if (topMatch.breed) {
                    const slug = createBreedSlug(topMatch.breed);
                    const isIsMixed = topMatch.breed_type === 'Mixed Breed';
                    const path = isIsMixed ? `/mixed-breeds/${slug}` : `/breeds/${slug}`;
                    onSeeListings(path);
                  }
                }} 
                className="w-full bg-brand-soft-green hover:bg-brand-dark-green"
              >
                <Dog className="mr-2 h-5 w-5" />
                See Listings for This Breed
              </Button>
            </div>
          </div>

          {matches.length > 1 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h5 className="text-lg font-medium text-gray-700 mb-4">Other Great Matches:</h5>
              <div className="grid grid-cols-1 gap-6">
                {matches.slice(1, 3).map((match, index) => (
                  <div key={match.id} className="flex flex-col md:flex-row gap-4 p-4 border border-gray-200 rounded-lg">
                    <div className="w-full md:w-64 h-64 rounded-md overflow-hidden flex-shrink-0">
                      <img 
                        src={getBreedImage(match, index + 1)} 
                        alt={match.breed || 'Dog breed'} 
                        className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity media-scroll-fix"
                        onClick={() => handleImageClick(getBreedImage(match, index + 1), match.breed || 'Dog breed')}
                        draggable={false}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h6 className="font-medium text-lg">{match.breed}</h6>
                        {(() => {
                          const tierInfo = getTierInfo(match.tier);
                          const IconComponent = tierInfo.icon;
                          return (
                            <Badge className={`${tierInfo.color} flex items-center gap-1`} variant="secondary">
                              <IconComponent className="h-3 w-3" />
                              {tierInfo.badge}
                            </Badge>
                          );
                        })()}
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{match.description || 'A wonderful breed that matches your preferences.'}</p>
                      <Button 
                        onClick={() => {
                          if (match.breed) {
                            const slug = createBreedSlug(match.breed);
                            const isIsMixed = match.breed_type === 'Mixed Breed';
                            const path = isIsMixed ? `/mixed-breeds/${slug}` : `/breeds/${slug}`;
                            onSeeListings(path);
                          }
                        }}
                        variant="outline"
                        className="border-brand-soft-green text-brand-soft-green hover:bg-brand-soft-green hover:text-white"
                        size="sm"
                      >
                        <Dog className="mr-2 h-4 w-4" />
                        See Listings for This Breed
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex flex-col sm:flex-row gap-3 bg-gray-50 p-4">
          {onRerollResults && (
            <Button 
              onClick={onRerollResults}
              variant="outline"
              className="w-full sm:w-auto bg-white border-brand-soft-green text-brand-soft-green hover:bg-brand-soft-green/10"
            >
              <Shuffle className="mr-2 h-4 w-4" />
              Re-roll Results
            </Button>
          )}
          <Button 
            onClick={onBrowseBreeds} 
            variant="outline"
            className="w-full bg-white border-brand-soft-green text-brand-soft-green hover:bg-brand-soft-green/10"
          >
            <ListFilter className="mr-2 h-5 w-5" />
            Browse All Breeds
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default QuizResult;
