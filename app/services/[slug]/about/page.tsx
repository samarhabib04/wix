'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ChevronLeft, Loader2 } from 'lucide-react';
import PartnerBadge from '@/components/ui/partner-badge';
import Image from 'next/image';
import { formatEircodeForDisplay } from '@/lib/utils/eircode-geocoding';
import { getBusinessServiceTypeLabel } from '@/lib/config/business-service-types';

interface BusinessListing {
  id: string;
  name: string;
  type: string;
  address: string;
  eircode?: string | null;
  county: string;
  phone: string;
  email?: string;
  website?: string;
  partner: boolean;
  rating: number;
  reviews: number;
  description: string;
  opening_hours?: any;
  social?: any;
  coordinates?: any;
  reviews_list?: any;
  banner_image?: string;
  logo_image?: string;
  slug: string;
  admin_approved: boolean;
  vet_partner_tier?: 'free' | 'paid';
  user_id?: string;
  refund_policy?: string;
  gallery_images?: string[];
  about_us?: string;
}

export default function AboutUsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const { toast } = useToast();
  
  const [business, setBusiness] = useState<BusinessListing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const fetchBusiness = async () => {
      if (!slug) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('business_listings')
          .select('id, name, type, address, eircode, county, phone, website, description, logo_image, banner_image, coordinates, social, opening_hours, about_us, gallery_images, status, admin_approved, admin_notes, slug, partner, user_id, created_at, updated_at, views, rating, reviews, reviews_list, email, is_vet_partner, subscription_tier, refund_policy')
          .eq('slug', slug)
          .eq('admin_approved', true)
          .single();

        if (error) {
          console.error('Error fetching business:', error);
          setBusiness(null);
          setIsLoading(false);
          return;
        }

        const businessData = data as any;
        
        // Check if business owner is suspended
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('is_suspended, status')
          .eq('id', businessData.user_id)
          .single();

        if (userProfile) {
          const isSuspended = userProfile.is_suspended === true || userProfile.status === 'suspended';
          if (isSuspended) {
            setBusiness(null);
            setIsLoading(false);
            return;
          }
        }

        setBusiness(businessData as BusinessListing);

        // Check subscription for premium or elite_marketplace
        const userId = businessData.user_id;
        if (userId) {
          const { data: subscription } = await supabase
            .from('business_subscriptions' as any)
            .select('subscription_tier, status')
            .eq('user_id', userId)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          const hasPremiumOrElite = (subscription as any)?.subscription_tier === 'premium' || 
                                    (subscription as any)?.subscription_tier === 'elite_marketplace';
          
          setHasAccess(hasPremiumOrElite);
        } else {
          setHasAccess(false);
        }
      } catch (error) {
        console.error('Error fetching business:', error);
        setBusiness(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBusiness();
  }, [slug]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-brand-dark-green" />
        </div>
      </div>
    );
  }

  if (!business || !hasAccess) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Page Not Found</h1>
          <p className="text-gray-600 mb-6">This page is only available for Premium and Elite Marketplace businesses.</p>
          <Link href="/services">
            <Button className="bg-brand-dark-green hover:bg-brand-soft-green">
              Back to Services
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Parse gallery_images if it's a JSON string
  let galleryImages: string[] = [];
  if (business.gallery_images) {
    if (typeof business.gallery_images === 'string') {
      try {
        galleryImages = JSON.parse(business.gallery_images);
      } catch {
        galleryImages = [];
      }
    } else if (Array.isArray(business.gallery_images)) {
      galleryImages = business.gallery_images;
    }
  }

  return (
    <>
      {/* Back Button */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 max-w-7xl">
        <Link 
          href={`/services/${business.slug}`} 
          className="inline-flex items-center text-brand-dark-green hover:text-brand-soft-green"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to {business.name}
        </Link>
      </div>

      {/* Hero Banner Section */}
      <section className="w-full overflow-hidden">
        <div className="relative w-full h-44 sm:h-52 md:h-64 lg:h-72 bg-gray-200">
          {business.banner_image ? (
            <img 
              src={business.banner_image} 
              alt={business.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-brand-dark-green to-brand-soft-green"></div>
          )}
        </div>
        
        {/* Profile Info Section */}
        <div className="bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative max-w-7xl">
            <div className="absolute left-4 sm:left-6 md:left-8 -top-10 sm:-top-12 md:-top-14 z-10">
              <Avatar className="h-20 w-20 sm:h-24 sm:w-24 md:h-32 md:w-32 border-4 border-white shadow-md bg-white">
                {business.logo_image ? (
                  <AvatarImage src={business.logo_image} alt={business.name} className="object-cover" />
                ) : (
                  <AvatarFallback className="bg-brand-soft-green text-white text-2xl md:text-3xl">
                    {business.name.charAt(0)}
                  </AvatarFallback>
                )}
              </Avatar>
            </div>

            <div className="pt-4 md:pt-5 pb-4 pl-24 sm:pl-28 md:pl-36 pr-4 sm:pr-6">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-berkshire text-gray-900 leading-tight break-words">
                  About {business.name}
                </h1>
                {business.partner && (
                  <PartnerBadge />
                )}
              </div>
              
              <div className="flex items-center gap-2 mt-1 text-gray-600 text-sm md:text-base flex-wrap">
                <span className="capitalize font-medium">{getBusinessServiceTypeLabel(business.type)}</span>
                {business.county && (
                  <>
                    <span className="text-gray-400">•</span>
                    <span>{business.county}</span>
                  </>
                )}
                {formatEircodeForDisplay(business.eircode) && (
                  <>
                    <span className="text-gray-400">•</span>
                    <span className="font-mono text-xs sm:text-sm tracking-wide">
                      {formatEircodeForDisplay(business.eircode)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-200"></div>
        </div>
      </section>

      {/* Main Content */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl overflow-x-hidden">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* About Us Text Content */}
          {business.about_us ? (
            <Card>
              <CardContent className="p-6">
                <h2 className="font-berkshire text-2xl text-brand-dark-green mb-4">Our Story</h2>
                <div className="prose max-w-none min-w-0">
                  <p className="text-gray-700 whitespace-pre-wrap break-words break-all leading-relaxed">
                    {business.about_us}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6">
                <p className="text-gray-500 italic">No about us content available yet.</p>
              </CardContent>
            </Card>
          )}

          {/* Gallery Images */}
          {galleryImages.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h2 className="font-berkshire text-2xl text-brand-dark-green mb-6">Gallery</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {galleryImages.map((imageUrl, index) => (
                    <div
                      key={index}
                      className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group cursor-pointer"
                      onClick={() => {
                        // Open image in lightbox or full view
                        window.open(imageUrl, '_blank');
                      }}
                    >
                      <Image
                        src={imageUrl}
                        alt={`${business.name} gallery image ${index + 1}`}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </>
  );
}
