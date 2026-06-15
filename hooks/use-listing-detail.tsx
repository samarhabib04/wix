
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { sellerDisplayNameWithFallback } from "@/lib/utils/seller-display";
import { firstRpcRow } from "@/lib/utils/rpc-rows";
import { saleListingNotExpiredOrFilter } from "@/lib/listings/public-marketplace-sale-status";

export interface ListingDetail {
  id: string;
  title: string;
  price: number;
  location: string;
  breed: string;
  breed_type?: string; // Added for crossbreed support
  breed_1?: string; // Added for crossbreed support
  breed_2?: string; // Added for crossbreed support
  date_of_birth: string;
  male_count: number;
  female_count: number;
  description: string;
  vet_name: string;
  vet_location: string;
  images: string[];
  primary_image_index?: number; // Added to track primary image index
  video_url?: string;
  gold_star: boolean;
  green_tick: boolean;
  seller_id: string;
  same_pricing: string;
  puppy_details?: any[];
  selected_colors?: string[];
  created_at: string;
  updated_at: string;
  seller_name?: string;
  seller_phone?: string;
  seller_email?: string;
  // Family tree properties
  mother_name?: string;
  mother_breed?: string;
  mother_image?: string;
  father_name?: string;
  father_breed?: string;
  father_image?: string;
  maternal_grandmother_name?: string;
  maternal_grandmother_breed?: string;
  maternal_grandmother_image?: string;
  maternal_grandfather_name?: string;
  maternal_grandfather_breed?: string;
  maternal_grandfather_image?: string;
  paternal_grandmother_name?: string;
  paternal_grandmother_breed?: string;
  paternal_grandmother_image?: string;
  paternal_grandfather_name?: string;
  paternal_grandfather_breed?: string;
  paternal_grandfather_image?: string;
}

// Helper function to safely convert puppy_details JSON to array
const safePuppyDetailsConversion = (puppyDetailsData: any): any[] => {
  if (!puppyDetailsData) return [];
  if (Array.isArray(puppyDetailsData)) return puppyDetailsData;
  if (typeof puppyDetailsData === 'string') {
    try {
      const parsed = JSON.parse(puppyDetailsData);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Failed to parse puppy_details JSON:', e);
      return [];
    }
  }
  return [];
};

export const useListingDetail = (id: string) => {
  return useQuery({
    queryKey: ['listing-detail', 'pn2', id],
    queryFn: async (): Promise<ListingDetail | null> => {

      // First try to fetch by UUID (if it looks like a UUID)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      
      if (isUUID) {
        const { data, error } = await supabase
          .from('sale_listings')
          .select(`
            *,
            mother_name,
            mother_breed,
            mother_image,
            father_name,
            father_breed,
            father_image,
            maternal_grandmother_name,
            maternal_grandmother_breed,
            maternal_grandmother_image,
            maternal_grandfather_name,
            maternal_grandfather_breed,
            maternal_grandfather_image,
            paternal_grandmother_name,
            paternal_grandmother_breed,
            paternal_grandmother_image,
            paternal_grandfather_name,
            paternal_grandfather_breed,
            paternal_grandfather_image
          `)
          .eq('id', id)
          .eq('admin_approved', true)
          .eq('is_published', true)
          .or(saleListingNotExpiredOrFilter())
          .maybeSingle();

        if (error) {
          console.error('Error fetching listing detail by UUID:', error);
          throw error;
        }

        if (data) {
          const [{ data: profile }, { data: publicNameRows, error: publicNameError }, { data: publicContactRows, error: publicContactError }] =
            await Promise.all([
              supabase
                .from('user_profiles')
                .select('first_name, last_name, business_name, phone, email')
                .eq('id', data.seller_id)
                .maybeSingle(),
              supabase.rpc('get_public_user_name', {
                user_id_param: data.seller_id,
              }),
              supabase.rpc('get_public_user_contact', {
                user_id_param: data.seller_id,
              }),
            ]);

          if (publicNameError) {
            console.error('get_public_user_name (listing):', publicNameError);
          }
          if (publicContactError) {
            console.error('get_public_user_contact (listing):', publicContactError);
          }

          const pub = firstRpcRow<{
            first_name: string | null;
            last_name: string | null;
            business_name: string | null;
          }>(publicNameRows);
          const publicContact = firstRpcRow<{ phone: string | null }>(publicContactRows);

          const displayFields = {
            first_name: profile?.first_name ?? pub?.first_name ?? null,
            last_name: profile?.last_name ?? pub?.last_name ?? null,
            business_name: profile?.business_name ?? pub?.business_name ?? null,
            email: profile?.email ?? null,
          };

          // Fallback extraction from legacy JSON family_tree if individual columns are empty
          const ft = (data as any).family_tree as any[] | null | undefined;
          const findInFT = (rels: string[], key: 'name' | 'breed' | 'image') => {
            if (!Array.isArray(ft)) return undefined;
            const relSet = new Set(rels.map(r => r.toLowerCase()));
            const found = ft.find((m: any) => m && typeof m.relationship === 'string' && relSet.has(String(m.relationship).toLowerCase()));
            return found ? (found[key] || undefined) : undefined;
          };

          return {
            id: data.id,
            title: data.title,
            price: data.price || 0,
            location: data.location,
            breed: data.breed,
            breed_type: data.breed_type ?? undefined, // Added for crossbreed support
            breed_1: data.breed_1 ?? undefined, // Added for crossbreed support
            breed_2: data.breed_2 ?? undefined, // Added for crossbreed support
            date_of_birth: data.date_of_birth ?? undefined,
            male_count: data.male_count,
            female_count: data.female_count,
            description: data.description,
            vet_name: data.vet_name,
            vet_location: data.vet_location,
            images: data.images || [],
            primary_image_index: data.primary_image_index ?? undefined,
            video_url: data.video_url ?? undefined,
            gold_star: data.gold_star ?? undefined,
            green_tick: data.green_tick ?? undefined,
            seller_id: data.seller_id ?? undefined,
            same_pricing: data.same_pricing ?? undefined,
            puppy_details: safePuppyDetailsConversion(data.puppy_details),
            selected_colors: Array.isArray(data.selected_colors) 
                ? (data.selected_colors as any[]).filter((c): c is string => typeof c === 'string')
                : (data.selected_colors && typeof data.selected_colors === 'string' ? [data.selected_colors] : []),
            created_at: data.created_at,
            updated_at: data.updated_at,
            seller_name: sellerDisplayNameWithFallback(displayFields, data.seller_id),
            seller_phone: profile?.phone || publicContact?.phone || undefined,
            seller_email: profile?.email || undefined,
            // Family tree data with legacy JSON fallback
            mother_name: data.mother_name ?? findInFT(['mother'], 'name'),
            mother_breed: data.mother_breed ?? findInFT(['mother'], 'breed'),
            mother_image: data.mother_image ?? findInFT(['mother'], 'image'),
            father_name: data.father_name ?? findInFT(['father'], 'name'),
            father_breed: data.father_breed ?? findInFT(['father'], 'breed'),
            father_image: data.father_image ?? findInFT(['father'], 'image'),
            maternal_grandmother_name: data.maternal_grandmother_name ?? findInFT(['maternal-grandmother', 'maternal_grandmother'], 'name'),
            maternal_grandmother_breed: data.maternal_grandmother_breed ?? findInFT(['maternal-grandmother', 'maternal_grandmother'], 'breed'),
            maternal_grandmother_image: data.maternal_grandmother_image ?? findInFT(['maternal-grandmother', 'maternal_grandmother'], 'image'),
            maternal_grandfather_name: data.maternal_grandfather_name ?? findInFT(['maternal-grandfather', 'maternal_grandfather'], 'name'),
            maternal_grandfather_breed: data.maternal_grandfather_breed ?? findInFT(['maternal-grandfather', 'maternal_grandfather'], 'breed'),
            maternal_grandfather_image: data.maternal_grandfather_image ?? findInFT(['maternal-grandfather', 'maternal_grandfather'], 'image'),
            paternal_grandmother_name: data.paternal_grandmother_name ?? findInFT(['paternal-grandmother', 'paternal_grandmother'], 'name'),
            paternal_grandmother_breed: data.paternal_grandmother_breed ?? findInFT(['paternal-grandmother', 'paternal_grandmother'], 'breed'),
            paternal_grandmother_image: data.paternal_grandmother_image ?? findInFT(['paternal-grandmother', 'paternal_grandmother'], 'image'),
            paternal_grandfather_name: data.paternal_grandfather_name ?? findInFT(['paternal-grandfather', 'paternal_grandfather'], 'name'),
            paternal_grandfather_breed: data.paternal_grandfather_breed ?? findInFT(['paternal-grandfather', 'paternal_grandfather'], 'breed'),
            paternal_grandfather_image: data.paternal_grandfather_image ?? findInFT(['paternal-grandfather', 'paternal_grandfather'], 'image'),
          };
        }
      }
      
      // If no UUID match or ID is numeric, try to find any published listing
      // This is a fallback for demo purposes when using numeric IDs from mock data

      const { data: fallbackData, error: fallbackError } = await supabase
        .from('sale_listings')
        .select(`
          *,
          mother_name,
          mother_breed,
          mother_image,
          father_name,
          father_breed,
          father_image,
          maternal_grandmother_name,
          maternal_grandmother_breed,
          maternal_grandmother_image,
          maternal_grandfather_name,
          maternal_grandfather_breed,
          maternal_grandfather_image,
          paternal_grandmother_name,
          paternal_grandmother_breed,
          paternal_grandmother_image,
          paternal_grandfather_name,
          paternal_grandfather_breed,
          paternal_grandfather_image
        `)
        .eq('admin_approved', true)
        .eq('is_published', true)
        .or(saleListingNotExpiredOrFilter())
        .limit(1)
        .maybeSingle();

      if (fallbackError) {
        console.error('Error fetching fallback listing:', fallbackError);
        throw fallbackError;
      }

      if (fallbackData) {

        const [{ data: profile }, { data: publicNameRows, error: publicNameError }, { data: publicContactRows, error: publicContactError }] =
          await Promise.all([
            supabase
              .from('user_profiles')
              .select('first_name, last_name, business_name, phone, email')
              .eq('id', fallbackData.seller_id)
              .maybeSingle(),
            supabase.rpc('get_public_user_name', {
              user_id_param: fallbackData.seller_id,
            }),
            supabase.rpc('get_public_user_contact', {
              user_id_param: fallbackData.seller_id,
            }),
          ]);

        if (publicNameError) {
          console.error('get_public_user_name (listing fallback):', publicNameError);
        }
        if (publicContactError) {
          console.error('get_public_user_contact (listing fallback):', publicContactError);
        }

        const pubFb = firstRpcRow<{
          first_name: string | null;
          last_name: string | null;
          business_name: string | null;
        }>(publicNameRows);
        const publicContactFb = firstRpcRow<{ phone: string | null }>(publicContactRows);

        const displayFieldsFb = {
          first_name: profile?.first_name ?? pubFb?.first_name ?? null,
          last_name: profile?.last_name ?? pubFb?.last_name ?? null,
          business_name: profile?.business_name ?? pubFb?.business_name ?? null,
          email: profile?.email ?? null,
        };

        // Fallback extraction from legacy JSON family_tree if individual columns are empty
        const ft2 = (fallbackData as any).family_tree as any[] | null | undefined;
        const findInFT2 = (rels: string[], key: 'name' | 'breed' | 'image') => {
          if (!Array.isArray(ft2)) return undefined;
          const relSet = new Set(rels.map(r => r.toLowerCase()));
          const found = ft2.find((m: any) => m && typeof m.relationship === 'string' && relSet.has(String(m.relationship).toLowerCase()));
          return found ? (found[key] || undefined) : undefined;
        };

        return {
          id: fallbackData.id,
          title: fallbackData.title,
          price: fallbackData.price || 0,
          location: fallbackData.location,
          breed: fallbackData.breed,
          breed_type: fallbackData.breed_type ?? undefined, // Added for crossbreed support
          breed_1: fallbackData.breed_1 ?? undefined, // Added for crossbreed support
          breed_2: fallbackData.breed_2 ?? undefined, // Added for crossbreed support
          date_of_birth: fallbackData.date_of_birth ?? undefined,
          male_count: fallbackData.male_count,
          female_count: fallbackData.female_count,
          description: fallbackData.description ?? undefined,
          vet_name: fallbackData.vet_name ?? undefined,
          vet_location: fallbackData.vet_location ?? undefined,
          images: fallbackData.images || [],
          primary_image_index: fallbackData.primary_image_index ?? undefined,
          video_url: fallbackData.video_url ?? undefined,
          gold_star: fallbackData.gold_star ?? undefined,
          green_tick: fallbackData.green_tick ?? undefined,
          seller_id: fallbackData.seller_id ?? undefined,
          same_pricing: fallbackData.same_pricing ?? undefined,
          puppy_details: safePuppyDetailsConversion(fallbackData.puppy_details),
          selected_colors: Array.isArray(fallbackData.selected_colors) 
              ? (fallbackData.selected_colors as any[]).filter((c): c is string => typeof c === 'string')
              : (fallbackData.selected_colors && typeof fallbackData.selected_colors === 'string' ? [fallbackData.selected_colors] : []),
          created_at: fallbackData.created_at,
          updated_at: fallbackData.updated_at,
          seller_name: sellerDisplayNameWithFallback(displayFieldsFb, fallbackData.seller_id),
          seller_phone: profile?.phone || publicContactFb?.phone || undefined,
          seller_email: profile?.email || undefined,
          // Family tree data with legacy JSON fallback
          mother_name: fallbackData.mother_name ?? findInFT2(['mother'], 'name'),
          mother_breed: fallbackData.mother_breed ?? findInFT2(['mother'], 'breed'),
          mother_image: fallbackData.mother_image ?? findInFT2(['mother'], 'image'),
          father_name: fallbackData.father_name ?? findInFT2(['father'], 'name'),
          father_breed: fallbackData.father_breed ?? findInFT2(['father'], 'breed'),
          father_image: fallbackData.father_image ?? findInFT2(['father'], 'image'),
          maternal_grandmother_name: fallbackData.maternal_grandmother_name ?? findInFT2(['maternal-grandmother', 'maternal_grandmother'], 'name'),
          maternal_grandmother_breed: fallbackData.maternal_grandmother_breed ?? findInFT2(['maternal-grandmother', 'maternal_grandmother'], 'breed'),
          maternal_grandmother_image: fallbackData.maternal_grandmother_image ?? findInFT2(['maternal-grandmother', 'maternal_grandmother'], 'image'),
          maternal_grandfather_name: fallbackData.maternal_grandfather_name ?? findInFT2(['maternal-grandfather', 'maternal_grandfather'], 'name'),
          maternal_grandfather_breed: fallbackData.maternal_grandfather_breed ?? findInFT2(['maternal-grandfather', 'maternal_grandfather'], 'breed'),
          maternal_grandfather_image: fallbackData.maternal_grandfather_image ?? findInFT2(['maternal-grandfather', 'maternal_grandfather'], 'image'),
          paternal_grandmother_name: fallbackData.paternal_grandmother_name ?? findInFT2(['paternal-grandmother', 'paternal_grandmother'], 'name'),
          paternal_grandmother_breed: fallbackData.paternal_grandmother_breed ?? findInFT2(['paternal-grandmother', 'paternal_grandmother'], 'breed'),
          paternal_grandmother_image: fallbackData.paternal_grandmother_image ?? findInFT2(['paternal-grandmother', 'paternal_grandmother'], 'image'),
          paternal_grandfather_name: fallbackData.paternal_grandfather_name ?? findInFT2(['paternal-grandfather', 'paternal_grandfather'], 'name'),
          paternal_grandfather_breed: fallbackData.paternal_grandfather_breed ?? findInFT2(['paternal-grandfather', 'paternal_grandfather'], 'breed'),
          paternal_grandfather_image: fallbackData.paternal_grandfather_image ?? findInFT2(['paternal-grandfather', 'paternal_grandfather'], 'image'),
        };
      }

      return null;
    },
    enabled: !!id,
  });
};
