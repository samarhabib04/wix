
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from 'next/navigation';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Calendar, RotateCcw, Eye, MoreVertical, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import QuizResultsModal from './QuizResultsModal';

interface QuizResult {
  id: string;
  quiz_answers: any;
  breed_matches: any[];
  created_at: string;
}

const SavedQuizResults: React.FC = () => {
  const router = useRouter();
  const [savedResults, setSavedResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedResult, setSelectedResult] = useState<QuizResult | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [breedImages, setBreedImages] = useState<Record<string, string>>({});
  const [imageLoadErrors, setImageLoadErrors] = useState<Record<string, boolean>>({});
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchSavedResults();
    }
  }, [user]);

  useEffect(() => {
    const fetchBreedImages = async () => {
      if (savedResults.length === 0) return;

      try {
        // Get all unique breed names from all results
        const allBreedNames = new Set<string>();
        savedResults.forEach(result => {
          result.breed_matches.forEach(breed => {
            if (breed.breed) {
              allBreedNames.add(breed.breed);
            }
          });
        });

        if (allBreedNames.size === 0) return;
        const { data, error } = await supabase
          .from('quiz_breeds')
          .select('breed, image_url')
          .in('breed', Array.from(allBreedNames));

        if (error) {
          console.error('SavedQuizResults: Error fetching breed images:', error);
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
        console.error('SavedQuizResults: Error fetching breed images:', error);
      }
    };

    fetchBreedImages();
  }, [savedResults]);

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

  const fetchSavedResults = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('quiz_results')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to match our interface
      const transformedData = (data || []).map(item => ({
        id: item.id,
        quiz_answers: item.quiz_answers,
        breed_matches: Array.isArray(item.breed_matches) ? item.breed_matches : [],
        created_at: item.created_at
      }));

      setSavedResults(transformedData);
    } catch (error) {
      console.error('Error fetching saved quiz results:', error);
      toast({
        title: "Error",
        description: "Failed to load your saved quiz results.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteQuizResult = async (resultId: string) => {
    if (!user) return;

    setDeletingId(resultId);
    try {
      const { error } = await supabase
        .from('quiz_results')
        .delete()
        .eq('id', resultId)
        .eq('user_id', user.id);

      if (error) throw error;

      setSavedResults(prev => prev.filter(result => result.id !== resultId));
      toast({
        title: "Success",
        description: "Quiz result deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting quiz result:', error);
      toast({
        title: "Error",
        description: "Failed to delete quiz result.",
        variant: "destructive"
      });
    } finally {
      setDeletingId(null);
    }
  };

  const viewQuizResults = (result: QuizResult) => {
    setSelectedResult(result);
    setModalOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTopBreeds = (breedMatches: any[]) => {
    return breedMatches.slice(0, 3).map(breed => breed.breed).join(', ');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-dark-green"></div>
      </div>
    );
  }

  if (savedResults.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="mb-4">
          <RotateCcw className="mx-auto w-12 h-12 text-gray-300" />
        </div>
        <h3 className="text-xl font-semibold mb-2">No Quiz Results Yet</h3>
        <p className="text-gray-500 mb-4">
          Take our breed quiz to find your perfect match and see your results here.
        </p>
        <Button 
          onClick={() => router.push('/quiz')}
          className="bg-brand-soft-green hover:bg-brand-dark-green text-white"
        >
          Take Quiz Now
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          <Button 
            onClick={() => router.push('/quiz')}
            className="bg-brand-soft-green hover:bg-brand-dark-green text-white w-full sm:w-auto"
            size="sm"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Take New Quiz
          </Button>
        </div>

        {savedResults.map((result) => (
          <Card key={result.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <CardTitle className="text-lg">Quiz Results</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="h-4 w-4 mr-1" />
                    {formatDate(result.created_at)}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        onClick={() => viewQuizResults(result)}
                        className="cursor-pointer"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Your Quiz Results
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => deleteQuizResult(result.id)}
                        disabled={deletingId === result.id}
                        className="cursor-pointer text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {deletingId === result.id ? 'Deleting...' : 'Delete'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Top match with image */}
                {result.breed_matches.length > 0 && (
                  <div className="flex flex-col sm:flex-row gap-4 p-3 bg-brand-soft-green/10 rounded-lg">
                    <div className="flex-shrink-0 w-full sm:w-24 aspect-square">
                      <img 
                        src={getBreedImage(result.breed_matches[0], 0)}
                        alt={result.breed_matches[0].breed || 'Top match'}
                        className="w-full h-full object-cover rounded-lg aspect-square"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          const breed = result.breed_matches[0];
                          const currentSrc = target.src;
                          
                          // Check which image source failed and mark it as error
                          if (breedImages[breed.breed] && currentSrc === breedImages[breed.breed]) {
                            handleImageError(breed.breed, 'supabase');
                          } else if (breed.image_url && currentSrc === breed.image_url) {
                            handleImageError(breed.breed, 'provided');
                          }
                          
                          // Set fallback image
                          target.src = getFallbackImage(0);
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="font-medium text-brand-dark-green">Top Match: </span>
                          <span className="text-gray-900 font-semibold">{result.breed_matches[0].breed}</span>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="w-full sm:w-auto text-xs"
                          onClick={() => viewQuizResults(result)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View Your Quiz Results
                        </Button>
                      </div>
                      {result.breed_matches[0].description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {result.breed_matches[0].description}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Additional matches */}
                {result.breed_matches.length > 1 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Other matches ({result.breed_matches.length - 1} more):
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {result.breed_matches.slice(1, 5).map((breed, index) => (
                        <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                          <div className="w-12 h-12 flex-shrink-0 aspect-square">
                            <img 
                              src={getBreedImage(breed, index + 1)}
                              alt={breed.breed || 'Breed match'}
                              className="w-full h-full object-cover rounded aspect-square"
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
                                target.src = getFallbackImage(index + 1);
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-700 truncate">
                            {breed.breed}
                          </span>
                        </div>
                      ))}
                    </div>
                    {result.breed_matches.length > 5 && (
                      <p className="text-xs text-gray-500 mt-2">
                        +{result.breed_matches.length - 5} more breeds found
                      </p>
                    )}
                  </div>
                )}

                <div className="text-sm text-gray-500 pt-2 border-t">
                  Found {result.breed_matches.length} matching breed{result.breed_matches.length !== 1 ? 's' : ''}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quiz Results Modal */}
      {selectedResult && (
        <QuizResultsModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedResult(null);
          }}
          breedMatches={selectedResult.breed_matches}
          quizAnswers={selectedResult.quiz_answers}
          createdAt={selectedResult.created_at}
        />
      )}
    </>
  );
};

export default SavedQuizResults;
