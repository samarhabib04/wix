import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { findMatchingBreedForFilter, formatBreedName } from "@/lib/utils/breed-utils";

export interface BreedInfo {
  id: string;
  breed: string;
  image_url: string;
  description: string;
  size: string;
  energy: string;
  grooming: string;
  life_expectancy: string;
  beginner_friendly: string;
  temperament: string[];
  special_considerations: string[];
}

export const useBreedInfo = (breedName: string) => {
  // Resolve to canonical DOG_BREEDS name: handles "goldenretriever", "Beautiful golden retriever", etc.
  const trimmed = breedName.trim();
  const lookupName = trimmed
    ? findMatchingBreedForFilter(trimmed) || formatBreedName(trimmed)
    : "";

  return useQuery({
    queryKey: ["breed-info", lookupName],
    queryFn: async (): Promise<BreedInfo | null> => {
      if (!lookupName) return null;

      // Try to find exact match first
      let { data, error } = await supabase
        .from("quiz_breeds")
        .select("*")
        .ilike("breed", lookupName)
        .maybeSingle();

      if (error) {
        console.error('Error fetching breed info:', error);
        throw error;
      }

      // If no exact match, try partial match
      if (!data) {
        const { data: partialData, error: partialError } = await supabase
          .from("quiz_breeds")
          .select("*")
          .ilike("breed", `%${lookupName}%`)
          .limit(1)
          .maybeSingle();

        if (partialError) {
          console.error('Error fetching breed info with partial match:', partialError);
          throw partialError;
        }

        data = partialData;
      }

      if (!data) {

        return null;
      }

      return {
        id: data.id,
        breed: data.breed,
        image_url: data.image_url || '',
        description: data.description || '',
        size: data.size || '',
        energy: data.energy || '',
        grooming: data.grooming || '',
        life_expectancy: data.life_expectancy || '',
        beginner_friendly: data.beginner_friendly || '',
        temperament: Array.isArray(data.temperament) ? 
          data.temperament.filter(item => typeof item === 'string') as string[] : [],
        special_considerations: Array.isArray(data.special_considerations) ? 
          data.special_considerations.filter(item => typeof item === 'string') as string[] : []
      };
    },
    enabled: !!lookupName,
  });
};
