import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { findMatchingBreedForFilter, formatBreedName } from "@/lib/utils/breed-utils";

interface BreedInfo {
  id: string;
  breed: string;
  image_url?: string;
  description?: string;
  temperament?: any;
  grooming?: string;
  energy?: string;
  size?: string;
  life_expectancy?: string;
}

interface CrossbreedInfo {
  breed1?: BreedInfo;
  breed2?: BreedInfo;
}

async function fetchOneBreed(breedName: string): Promise<any | null> {
  const trimmed = breedName.trim();
  if (!trimmed) return null;

  const lookup = findMatchingBreedForFilter(trimmed) || formatBreedName(trimmed);
  if (!lookup.trim()) return null;

  let { data, error } = await supabase
    .from("quiz_breeds")
    .select("*")
    .ilike("breed", lookup)
    .maybeSingle();

  if (error) {
    console.error('Error fetching breed row:', error);
    return null;
  }

  if (!data) {
    const { data: partial, error: partialError } = await supabase
      .from("quiz_breeds")
      .select("*")
      .ilike("breed", `%${lookup}%`)
      .limit(1)
      .maybeSingle();

    if (partialError) {
      console.error('Error fetching breed row (partial):', partialError);
      return null;
    }
    data = partial;
  }

  return data;
}

export const useCrossbreedInfo = (breed1Name?: string, breed2Name?: string) => {
  return useQuery({
    queryKey: ['crossbreed-info', breed1Name, breed2Name],
    queryFn: async (): Promise<CrossbreedInfo> => {
      if (!breed1Name || !breed2Name) {
        return {};
      }

      try {
        const [breed1Raw, breed2Raw] = await Promise.all([
          fetchOneBreed(breed1Name),
          fetchOneBreed(breed2Name),
        ]);

        const normalize = (breed: any) =>
          breed
            ? {
                ...breed,
                image_url: breed.image_url ?? undefined,
                beginner_friendly: breed.beginner_friendly ?? undefined,
                breed_type: breed.breed_type ?? undefined,
                description: breed.description ?? undefined,
                energy: breed.energy ?? undefined,
                grooming: breed.grooming ?? undefined,
                life_expectancy: breed.life_expectancy ?? undefined,
                size: breed.size ?? undefined,
                special_considerations: breed.special_considerations ?? undefined,
                temperament: breed.temperament ?? undefined,
              }
            : undefined;

        const breed1 = normalize(breed1Raw);
        const breed2 = normalize(breed2Raw);

        return {
          breed1: breed1 || undefined,
          breed2: breed2 || undefined,
        };
      } catch (error) {
        console.error('Error fetching crossbreed info:', error);
        return {};
      }
    },
    enabled: !!breed1Name && !!breed2Name,
  });
};
