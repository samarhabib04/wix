import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export const useShowcaseConversion = () => {
  const [isConverting, setIsConverting] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const convertToSaleListing = async (showcaseId: string, formData?: any) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to convert showcase listings.",
        variant: "destructive",
      });
      return;
    }

    setIsConverting(true);

    try {
      // Get the showcase listing data
      const { data: showcase, error: showcaseError } = await supabase
        .from('showcase_listings')
        .select('*')
        .eq('id', showcaseId)
        .eq('seller_id', user.id)
        .single();

      if (showcaseError || !showcase) {
        throw new Error('Failed to fetch showcase listing or unauthorized');
      }

      // Check if already converted
      if (showcase.converted_to_sale_id) {
        toast({
          title: "Already Converted",
          description: "This showcase listing has already been converted to a sale listing.",
          variant: "destructive",
        });
        setIsConverting(false);
        return;
      }

      // Determine pricing fields based on form data or defaults
      let samePricing = 'yes';
      let uniformPrice = null;
      let minPrice = null;
      let maxPrice = null;

      if (formData?.pricingOption) {
        samePricing = formData.pricingOption === 'uniform' ? 'yes' : 'no';
        if (formData.pricingOption === 'uniform' && formData.uniformPrice) {
          uniformPrice = parseFloat(formData.uniformPrice);
        } else if (formData.pricingOption === 'range') {
          minPrice = formData.minPrice ? parseFloat(formData.minPrice) : null;
          maxPrice = formData.maxPrice ? parseFloat(formData.maxPrice) : null;
        }
      }

      // Determine breed fields based on form data or showcase data
      let finalBreedType = formData?.breedType || showcase.breed_type || 'pedigree';
      let finalBreed = '';
      let finalBreed1: string | null = null;
      let finalBreed2: string | null = null;

      if (formData) {
        if (formData.breedType === 'pedigree') {
          // For pedigree, use the breed value from form or showcase
          finalBreed = formData.breed || showcase.breed || '';
          finalBreed1 = finalBreed;
          finalBreed2 = null;
        } else if (formData.breedType === 'crossbreed') {
          // For crossbreed, combine breed1 and breed2
          finalBreed1 = formData.breed1 || showcase.breed1 || '';
          finalBreed2 = formData.breed2 || showcase.breed2 || '';
          finalBreed = finalBreed1 && finalBreed2 ? `${finalBreed1}-${finalBreed2}` : (showcase.breed || '');
        }
      } else {
        // Use showcase data
        finalBreed = showcase.breed || '';
        finalBreed1 = showcase.breed1 || null;
        finalBreed2 = showcase.breed2 || null;
      }

      // Auto-populate puppy prices for uniform pricing
      let finalPuppyDetails = formData?.puppyDetails || [];
      if (formData?.pricingOption === 'uniform' && formData?.uniformPrice && finalPuppyDetails.length > 0) {
        finalPuppyDetails = finalPuppyDetails.map((puppy: any) => ({
          ...puppy,
          price: formData.uniformPrice || puppy.price
        }));
      }

      // Create sale listing with merged data (form data takes precedence for specified fields)
      const saleListingData = {
        seller_id: user.id,
        title: formData?.title || showcase.title,
        breed_type: finalBreedType,
        breed: finalBreed,
        breed_1: finalBreed1,
        breed_2: finalBreed2,
        location: formData?.location || showcase.location,
        description: formData?.description || showcase.description,
        date_of_birth: formData?.dob ? formData.dob.toISOString().split('T')[0] : showcase.date_of_birth,
        male_count: formData?.maleCount ? parseInt(formData.maleCount) : (showcase.male_count || 0),
        female_count: formData?.femaleCount ? parseInt(formData.femaleCount) : (showcase.female_count || 0),
        energy: formData?.energy || null,
        size: formData?.size || null,
        puppy_details: finalPuppyDetails.length > 0 ? finalPuppyDetails : null,
        images: formData?.images || (Array.isArray(showcase.images) ? (showcase.images as string[]) : (showcase.images ? [showcase.images as string] : [])),
        primary_image_index: formData?.primaryImageIndex !== undefined ? formData.primaryImageIndex : showcase.primary_image_index,
        video_url: formData?.videoUrl || showcase.video_url,
        documents: formData?.documents || null,
        // Note: family_tree column doesn't exist in sale_listings table
        // Family tree data is stored in individual columns below
        // Extract family tree data into individual fields if provided
        // Helper function to extract family tree member data
        ...(formData?.familyTree && formData.familyTree.length > 0 ? (() => {
          const extractMember = (relationship: string) => {
            const member = formData.familyTree.find((m: any) => m.relationship === relationship);
            return member ? {
              name: member.name || '',
              breed: member.breed || '',
              dob: member.dateOfBirth ? new Date(member.dateOfBirth).toISOString().split('T')[0] : null,
              image: member.image || null
            } : null;
          };
          
          const mother = extractMember('mother');
          const father = extractMember('father');
          const maternalGrandmother = extractMember('maternal-grandmother');
          const maternalGrandfather = extractMember('maternal-grandfather');
          const paternalGrandmother = extractMember('paternal-grandmother');
          const paternalGrandfather = extractMember('paternal-grandfather');
          
          return {
            mother_name: mother?.name || showcase.mother_name,
            mother_breed: mother?.breed || showcase.mother_breed,
            mother_image: mother?.image || showcase.mother_image,
            mother_dob: mother?.dob || showcase.mother_dob,
            father_name: father?.name || showcase.father_name,
            father_breed: father?.breed || showcase.father_breed,
            father_image: father?.image || showcase.father_image,
            father_dob: father?.dob || showcase.father_dob,
            maternal_grandmother_name: maternalGrandmother?.name || showcase.maternal_grandmother_name,
            maternal_grandmother_breed: maternalGrandmother?.breed || showcase.maternal_grandmother_breed,
            maternal_grandmother_image: maternalGrandmother?.image || showcase.maternal_grandmother_image,
            maternal_grandmother_dob: maternalGrandmother?.dob || showcase.maternal_grandmother_dob,
            maternal_grandfather_name: maternalGrandfather?.name || showcase.maternal_grandfather_name,
            maternal_grandfather_breed: maternalGrandfather?.breed || showcase.maternal_grandfather_breed,
            maternal_grandfather_image: maternalGrandfather?.image || showcase.maternal_grandfather_image,
            maternal_grandfather_dob: maternalGrandfather?.dob || showcase.maternal_grandfather_dob,
            paternal_grandmother_name: paternalGrandmother?.name || showcase.paternal_grandmother_name,
            paternal_grandmother_breed: paternalGrandmother?.breed || showcase.paternal_grandmother_breed,
            paternal_grandmother_image: paternalGrandmother?.image || showcase.paternal_grandmother_image,
            paternal_grandmother_dob: paternalGrandmother?.dob || showcase.paternal_grandmother_dob,
            paternal_grandfather_name: paternalGrandfather?.name || showcase.paternal_grandfather_name,
            paternal_grandfather_breed: paternalGrandfather?.breed || showcase.paternal_grandfather_breed,
            paternal_grandfather_image: paternalGrandfather?.image || showcase.paternal_grandfather_image,
            paternal_grandfather_dob: paternalGrandfather?.dob || showcase.paternal_grandfather_dob,
          };
        })() : {
          mother_name: showcase.mother_name,
          mother_breed: showcase.mother_breed,
          mother_image: showcase.mother_image,
          mother_dob: showcase.mother_dob,
          father_name: showcase.father_name,
          father_breed: showcase.father_breed,
          father_image: showcase.father_image,
          father_dob: showcase.father_dob,
          maternal_grandmother_name: showcase.maternal_grandmother_name,
          maternal_grandmother_breed: showcase.maternal_grandmother_breed,
          maternal_grandmother_image: showcase.maternal_grandmother_image,
          maternal_grandmother_dob: showcase.maternal_grandmother_dob,
          maternal_grandfather_name: showcase.maternal_grandfather_name,
          maternal_grandfather_breed: showcase.maternal_grandfather_breed,
          maternal_grandfather_image: showcase.maternal_grandfather_image,
          maternal_grandfather_dob: showcase.maternal_grandfather_dob,
          paternal_grandmother_name: showcase.paternal_grandmother_name,
          paternal_grandmother_breed: showcase.paternal_grandmother_breed,
          paternal_grandmother_image: showcase.paternal_grandmother_image,
          paternal_grandmother_dob: showcase.paternal_grandmother_dob,
          paternal_grandfather_name: showcase.paternal_grandfather_name,
          paternal_grandfather_breed: showcase.paternal_grandfather_breed,
          paternal_grandfather_image: showcase.paternal_grandfather_image,
          paternal_grandfather_dob: showcase.paternal_grandfather_dob,
        }),
        converted_from_showcase_id: showcaseId,
        status: 'draft',
        is_published: false,
        admin_approved: false,
        vet_name: formData?.vetName || (showcase as any).vet_name || '',
        vet_location: formData?.vetLocation || (showcase as any).vet_location || '',
        same_pricing: samePricing,
        uniform_price: uniformPrice,
        min_price: minPrice,
        max_price: maxPrice
      };

      // Insert sale listing
      const { data: saleListing, error: saleError } = await supabase
        .from('sale_listings')
        .insert(saleListingData)
        .select()
        .single();

      if (saleError || !saleListing) {
        console.error('Sale listing creation error:', saleError);
        throw new Error(saleError?.message || 'Failed to create sale listing');
      }

      // Update showcase listing to mark as converted
      const { error: updateError } = await supabase
        .from('showcase_listings')
        .update({
          converted_to_sale_id: saleListing.id,
          is_expired: true
        })
        .eq('id', showcaseId);

      if (updateError) {
        // Try to clean up the created sale listing
        await supabase.from('sale_listings').delete().eq('id', saleListing.id);
        throw new Error('Failed to update showcase listing');
      }

      // Log the conversion
      const { error: logError } = await supabase
        .from('showcase_conversion_log')
        .insert({
          showcase_id: showcaseId,
          sale_listing_id: saleListing.id,
          converted_by: user.id
        });

      if (logError) {
        console.error('Failed to log conversion:', logError);
      }

      toast({
        title: "Conversion Successful!",
        description: "Your showcase listing has been converted to a sale listing draft. Watchers are notified when the sale listing goes live.",
      });

      await queryClient.invalidateQueries({ queryKey: ['seller-showcase-listings'] });
      await queryClient.invalidateQueries({ queryKey: ['seller-sale-listings'] });

      // Navigate to edit the sale listing
      router.push(`/edit-sale-listing/${saleListing.id}`);

    } catch (error: any) {
      console.error('Conversion error:', error);
      const errorMessage = error.message || error.details || "Failed to convert showcase listing to sale listing.";
      toast({
        title: "Conversion Failed",
        description: errorMessage,
        variant: "destructive",
      });
      setIsConverting(false);
      // Re-throw error so dialog can handle it
      throw error;
    }
  };

  return {
    convertToSaleListing,
    isConverting
  };
};
