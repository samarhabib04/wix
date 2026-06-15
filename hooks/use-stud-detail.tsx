
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { sellerDisplayNameWithFallback } from "@/lib/utils/seller-display";
import { firstRpcRow } from "@/lib/utils/rpc-rows";

export interface StudDetail {
  id: string;
  title: string;
  stud_fee: number;
  location: string;
  breed1?: string;
  breed2?: string;
  breed_type?: string;
  dob: string;
  sex?: string;
  description: string;
  vet_name: string;
  vet_location?: string;
  images: string[];
  video_url?: string;
  gold_star: boolean;
  green_tick: boolean;
  user_id: string;
  pick_of_litter?: boolean;
  created_at: string;
  updated_at: string;
  seller_name?: string;
  seller_phone?: string;
  seller_email?: string;
  microchip_number?: string;
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

export const useStudDetail = (id: string) => {
  return useQuery({
    // Bump when seller display / RPC logic changes so clients don't keep stale seller_name.
    queryKey: ['stud-detail', 'pn2', id],
    queryFn: async (): Promise<StudDetail | null> => {

      // First try to fetch by UUID (if it looks like a UUID)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      
      if (isUUID) {
        const { data, error } = await supabase
          .from('stud_listings')
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
          .maybeSingle();

        if (error) {
          console.error('Error fetching stud detail by UUID:', error);
          throw error;
        }

        if (data) {
          const sellerUserId = data.user_id != null ? String(data.user_id) : '';
          // RLS hides other users' rows on user_profiles for anonymous visitors; use the
          // existing SECURITY DEFINER RPC (same as messaging) for public display names.
          const [{ data: profile }, { data: publicNameRows, error: publicNameError }, { data: publicContactRows, error: publicContactError }] =
            await Promise.all([
              supabase
                .from('user_profiles')
                .select('first_name, last_name, business_name, phone, email')
                .eq('id', sellerUserId)
                .maybeSingle(),
              supabase.rpc('get_public_user_name', {
                user_id_param: sellerUserId,
              }),
              supabase.rpc('get_public_user_contact', {
                user_id_param: sellerUserId,
              }),
            ]);

          if (publicNameError) {
            console.error('get_public_user_name (stud):', publicNameError);
          }
          if (publicContactError) {
            console.error('get_public_user_contact (stud):', publicContactError);
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

          // Convert images from Json[] to string[]
          const imagesArray = Array.isArray(data.images) 
            ? data.images.filter((img): img is string => typeof img === 'string')
            : [];

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
            stud_fee: data.stud_fee || 0,
            location: data.location,
            breed1: data.breed1 ?? undefined,
            breed2: data.breed2 ?? undefined,
            breed_type: data.breed_type ?? undefined,
            dob: data.dob ?? undefined,
            sex: data.sex ?? undefined,
            description: data.description ?? undefined,
            vet_name: data.vet_name ?? undefined,
            vet_location: data.vet_location ?? undefined,
            images: imagesArray,
            video_url: data.video_url ?? undefined,
            gold_star: data.gold_star ?? undefined,
            green_tick: data.green_tick ?? undefined,
            user_id: data.user_id ?? undefined,
            pick_of_litter: data.pick_of_litter ?? undefined,
            created_at: data.created_at,
            updated_at: data.updated_at,
            seller_name: sellerDisplayNameWithFallback(displayFields, sellerUserId || data.user_id),
            seller_phone: profile?.phone || publicContact?.phone || undefined,
            seller_email: profile?.email || undefined,
            microchip_number: data.microchip_number ?? undefined,
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
      
      // If no UUID match, return null

      return null;
    },
    enabled: !!id,
  });
};
