import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { 
  getOptimizedBreedCounts, 
  getOptimizedBreedCount,
  type BreedCount,
  invalidateBreedCountsCache
} from '@/services/optimizedBreedCountingService';
import { formatBreedName, normalizeBreedForMatching } from '@/lib/utils/breed-utils';

export interface BreedData {
  id: number;
  name: string;
  slug: string;
  breed_type: string;
  image: string;
  availableCount: number;
  size: string;
  grooming: string;
  energy: string;
}

interface UseBreedDataReturn {
  breeds: BreedData[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Custom hook for fetching and managing breed data with accurate counts
 */
export const useBreedData = (breedType?: 'Pedigree' | 'Mixed' | 'all'): UseBreedDataReturn => {
  const [breeds, setBreeds] = useState<BreedData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBreedData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch quiz breeds data
      let query = supabase.from('quiz_breeds').select('*');
      
      if (breedType && breedType !== 'all') {
        const breedTypeFilter = breedType === 'Mixed' ? 'Mixed Breed' : breedType;
        query = query.eq('breed_type', breedTypeFilter);
      }

      const { data: breedsData, error: breedsError } = await query.order('breed');
      
      if (breedsError) throw breedsError;
      if (!breedsData) throw new Error('No breeds data received');

      // Use optimized breed counting with database cache
      const breedCounts = await getOptimizedBreedCounts({ 
        mode: breedType === 'Pedigree' ? 'Pedigree' : breedType === 'Mixed' ? 'Mixed' : 'all',
        useCache: true 
      });

      // Create breed slug helper
      const createBreedSlug = (breedName: string | undefined): string => {
        return (breedName || '')
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .replace(/\s+/g, '-')
          .trim();
      };

      // Map breeds with accurate counts from cache
      const mappedBreeds: BreedData[] = breedsData.map((breed, index) => {
        const normalized = normalizeBreedForMatching(breed.breed);
        const breedCountData = breedCounts.get(normalized);
        const availableCount = breedCountData?.totalCount || 0;
        
        return {
          id: index + 1,
          name: formatBreedName(breed.breed),
          slug: createBreedSlug(breed.breed),
          breed_type: breed.breed_type || 'Pedigree',
          image: breed.image_url || 'https://images.unsplash.com/photo-1605897472359-85e4b94d685d?q=80&w=600&auto=format&fit=crop',
          availableCount,
          size: breed.size?.toLowerCase() || 'medium',
          grooming: breed.grooming?.toLowerCase() || 'minimal',
          energy: breed.energy?.toLowerCase() || 'medium'
        };
      });

      setBreeds(mappedBreeds);
    } catch (err) {
      console.error('Error fetching breed data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch breed data');
      setBreeds([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBreedData();
  }, [breedType]);

  return {
    breeds,
    isLoading,
    error,
    refetch: () => {
      invalidateBreedCountsCache(); // Clear cache to get fresh data
      fetchBreedData();
    }
  };
};
