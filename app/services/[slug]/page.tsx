'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Facebook, Instagram, Globe, MapPin, Phone, Clock, Star, Heart, ChevronLeft, ArrowUpRight, Pencil, MapPinIcon, Mail, BadgeCheck, ShoppingCart, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { formatEircodeForDisplay } from '@/lib/utils/eircode-geocoding';
import { useWishlist } from '@/hooks/use-wishlist';
import WishlistAuthModal from '@/components/WishlistAuthModal';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import PartnerBadge from '@/components/ui/partner-badge';
import { getBusinessServiceTypeLabel } from '@/lib/config/business-service-types';
import ReviewForm from '@/components/user/ReviewForm';
import { sendBusinessEnquiryEmail } from '@/lib/utils/email-utils';

// Dynamically import ServicesMap with SSR disabled since it uses Leaflet
const ServicesMap = dynamic(() => import('@/components/services/ServicesMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full flex items-center justify-center bg-gray-100">Loading map...</div>
});

// Custom TikTok icon component with proper proportions
const TikTokIcon = () => (
  <svg width="20" height="20" viewBox="0 0 448 512" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M448 209.91a210.06 210.06 0 0 1-122.77-39.25V349.38A162.55 162.55 0 1 1 185 188.31V278.2a74.62 74.62 0 1 0 52.23 71.18V0l88 0a121.18 121.18 0 0 0 1.86 22.17h0A122.18 122.18 0 0 0 381 102.39a121.43 121.43 0 0 0 67 20.14Z" fill="#000000"/>
  </svg>
);

// Custom Facebook icon component  
const FacebookIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="#1877F2"/>
  </svg>
);

// Business data structure - Updated to match Supabase schema
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

const ServiceDetail: React.FC = () => {
  const params = useParams();
  const slug = params?.slug as string;
  const router = useRouter();
  const { toast } = useToast();
  const [business, setBusiness] = useState<BusinessListing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewFormOpen, setReviewFormOpen] = useState(false);
  const [businessReviews, setBusinessReviews] = useState<any[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [hoveredBusinessId, setHoveredBusinessId] = useState<string | null>(null);
  const [activePromotion, setActivePromotion] = useState<any | null>(null);
  const [isPaidPartner, setIsPaidPartner] = useState(false);
  const [isBusinessOwner, setIsBusinessOwner] = useState(false);
  const [enquiryFormOpen, setEnquiryFormOpen] = useState(false);
  const [enquiryFormData, setEnquiryFormData] = useState({ name: '', email: '', phone: '', message: '' });
  const [replyForms, setReplyForms] = useState<{ [reviewId: string]: { open: boolean; text: string } }>({});
  const [marketplaceProducts, setMarketplaceProducts] = useState<any[]>([]);
  const [hasPremiumOrElite, setHasPremiumOrElite] = useState(false);
  const { user } = useAuth();
  
  // Replace the local state with useWishlist hook
  const { 
    isInWishlist, 
    toggleWishlist, 
    wishlistAuthModalOpen, 
    setWishlistAuthModalOpen,
    pendingWishlistItem 
  } = useWishlist();

  // Create business array for map - moved before any conditional returns
  const businessForMap = useMemo(() => {
    if (!business) return [];
    
    // Get coordinates from business data or use default
    const coordinates = business.coordinates || { lat: 53.3498, lng: -6.2603 };
    
    return [{
      id: parseInt(business.id), // Convert to number for map component
      name: business.name,
      type: business.type,
      coordinates: coordinates,
      partner: business.partner,
      address: business.address,
      county: business.county,
      eircode: business.eircode,
      slug: business.slug
    }];
  }, [business]);
  
  // Fetch business data from Supabase
  useEffect(() => {
    const fetchBusiness = async () => {
      if (!slug) {
        setIsLoading(false);
        return;
      }

      try {

        const { data, error } = await supabase
          .from('business_listings')
          .select(`
            *,
            vet_partners (
              id,
              tier,
              status
            ),
            business_subscriptions (
              subscription_tier,
              status
            ),
            user_profiles!user_id (
              is_suspended,
              status
            )
          `)
          .eq('slug', slug)
          .eq('admin_approved', true)
          .single();

        if (error) {
          console.error('Error fetching business:', error);
          if (error.code !== 'PGRST116') { // Not found error
            toast({
              title: "Error",
              description: "Failed to load business details.",
              variant: "destructive"
            });
          }
          setBusiness(null);
        } else {

          const businessData = data as any;
          
          // Check if business owner is suspended
          const userProfile = businessData.user_profiles;
          if (userProfile) {
            const isSuspended = userProfile.is_suspended === true || userProfile.status === 'suspended';
            if (isSuspended) {
              // Business owner is suspended, don't show the business
              setBusiness(null);
              toast({
                title: "Business Not Available",
                description: "This business is currently unavailable.",
                variant: "destructive"
              });
              return;
            }
          }
          
          setBusiness(businessData as BusinessListing);
          
          // Determine if it's a paid partner and check for premium/elite subscription
          // IMPORTANT: Plans are user-level, not listing-level
          // All listings from the same user should show the same subscription tier
          // Match business_listings.user_id with business_subscriptions.user_id
          let isPaid = false;
          let hasEliteMarketplaceSubscription = false;
          let listingSubscriptionTier: string | null = null;
          
          // Get user_id from business data
          const userId = businessData.user_id;
          
          // Fetch subscription by user_id (not from join, as join uses business_id)
          // This ensures all listings from the same user show the same plan
          if (userId) {
            const { data: userSubscriptions, error: subError } = await supabase
              .from('business_subscriptions' as any)
              .select('subscription_tier, status')
              .eq('user_id', userId)
              .eq('status', 'active')
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (!subError && userSubscriptions && !('error' in userSubscriptions)) {
              const userSub = userSubscriptions as any;
              listingSubscriptionTier = userSub.subscription_tier;

              if (userSub.subscription_tier === 'premium' || 
                  userSub.subscription_tier === 'elite_marketplace') {
                isPaid = true;
              }
              if (userSub.subscription_tier === 'elite_marketplace') {
                hasEliteMarketplaceSubscription = true;
              }
            } else {

            }

          }
          
          // Fallback to business_listings.subscription_tier if no subscription found
          if (!listingSubscriptionTier) {
            if (businessData.subscription_tier === 'premium' || 
                businessData.subscription_tier === 'elite_marketplace') {
              listingSubscriptionTier = businessData.subscription_tier;
              if (businessData.subscription_tier === 'elite_marketplace') {
                hasEliteMarketplaceSubscription = true;
              }
              if (businessData.subscription_tier === 'premium') {
                isPaid = true;
              }
            }
          }
          
          if (businessData.partner) {
            // Also check vet_partners tier
            if (businessData.vet_partners && businessData.vet_partners.length > 0) {
              if (businessData.vet_partners[0].tier === 'paid') {
                isPaid = true;
              }
            } else if (businessData.vet_partner_tier === 'paid') {
              isPaid = true;
            }
          }
          
          setIsPaidPartner(isPaid);
          setHasPremiumOrElite(hasEliteMarketplaceSubscription);
          // Fetch marketplace products only if business has elite_marketplace subscription
          if (hasEliteMarketplaceSubscription && businessData.id) {
            fetchMarketplaceProducts(businessData.id);
          }
          
          // Check if current user is the business owner
          if (user && businessData.user_id === user.id) {
            setIsBusinessOwner(true);
          }
        }
      } catch (error) {
        console.error('Exception fetching business:', error);
        toast({
          title: "Error",
          description: "An unexpected error occurred.",
          variant: "destructive"
        });
        setBusiness(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBusiness();
  }, [slug]);

  // Track profile view when business is loaded
  useEffect(() => {
    const trackProfileView = async () => {
      if (!business || !business.id) return;
      
      // Don't count views if the current user is the business owner
      if (user && business.user_id === user.id) {
        return;
      }

      try {
        // Try to use RPC function first (more efficient and atomic)
        const { error: rpcError } = await supabase.rpc('increment_business_views', {
          business_id: business.id
        });

        // If RPC function doesn't exist or fails, use direct update as fallback
        if (rpcError) {

          // Get current views count
          const { data: currentBusiness, error: fetchError } = await supabase
            .from('business_listings')
            .select('views')
            .eq('id', business.id)
            .single();

          if (fetchError) {
            console.error('Error fetching current views:', fetchError);
            return;
          }

          const currentViews = (currentBusiness as any)?.views || 0;
          
          // Increment views
          const { error: updateError } = await supabase
            .from('business_listings')
            .update({ views: currentViews + 1 })
            .eq('id', business.id)
            .eq('admin_approved', true)
            .eq('status', 'approved');

          if (updateError) {
            console.error('Error updating views:', updateError);
          }
        }
      } catch (error) {
        console.error('Error tracking profile view:', error);
        // Silently fail - don't interrupt user experience
      }
    };

    // Track view after a short delay to ensure page is fully loaded and user actually viewed it
    const timer = setTimeout(() => {
      trackProfileView();
    }, 2000); // 2 second delay to ensure it's a real view

    return () => clearTimeout(timer);
  }, [business, user]);

  // Fetch marketplace products for the business by user_id
  const fetchMarketplaceProducts = async (businessId: string) => {
    try {
      // First get user_id from business listing
      const { data: business, error: businessError } = await supabase
        .from('business_listings')
        .select(`
          user_id,
          user_profiles!user_id (
            is_suspended,
            status
          )
        `)
        .eq('id', businessId)
        .single();

      if (businessError || !business) {
        console.error('Error fetching business for suspension check:', businessError);
        return;
      }

      const userId = (business as any).user_id;
      if (!userId) {
        console.error('No user_id found for business');
        return;
      }

      // If business owner is suspended, don't fetch products
      const userProfile = business.user_profiles;
      if (userProfile) {
        const isSuspended = userProfile.is_suspended === true || userProfile.status === 'suspended';
        if (isSuspended) {
          setMarketplaceProducts([]);
          return;
        }
      }

      // Fetch marketplace products by user_id for consistency
      const { data, error } = await supabase
        .from('marketplace_products' as any)
        .select('*')
        .eq('user_id', userId)
        .eq('is_published', true)
        .eq('admin_approved', true)
        .eq('status', 'live')
        .gt('stock_quantity', 0)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching marketplace products:', error);
        return;
      }

      setMarketplaceProducts((data as any) || []);
    } catch (error) {
      console.error('Error fetching marketplace products:', error);
    }
  };

  // Fetch reviews for the business
  useEffect(() => {
    const fetchReviews = async () => {
      if (!business?.id) return;

      setIsLoadingReviews(true);
      try {
        const { data, error } = await supabase
          .from('business_reviews')
          .select(`
            id,
            rating,
            comment,
            reviewer_name,
            created_at,
            status,
            vet_partner_review_replies (
              id,
              reply_text,
              created_at,
              updated_at
            )
          `)
          .eq('business_id', business.id)
          .eq('status', 'approved')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching reviews:', error);
        } else {
          setBusinessReviews(data || []);
        }
      } catch (error) {
        console.error('Exception fetching reviews:', error);
      } finally {
        setIsLoadingReviews(false);
      }
    };

    fetchReviews();
  }, [business?.id]);

  // Fetch active promotion
  useEffect(() => {
    const fetchPromotion = async () => {
      if (!business?.id) return;

      try {
        const { data, error } = await supabase
          .from('business_promotions' as any)
          .select('*')
          .eq('business_id', business.id)
          .eq('is_active', true)
          .eq('admin_approved', true)
          .gte('end_date', new Date().toISOString())
          .lte('start_date', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching promotion:', error);
        } else if (data) {
          setActivePromotion(data);
        }
      } catch (error) {
        console.error('Exception fetching promotion:', error);
      }
    };

    fetchPromotion();
  }, [business?.id]);
  
  // Handle favorite toggle
  const handleToggleWishlist = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (business) {
      toggleWishlist(business.id.toString(), "service");
    }
  };

  // Handle review submission
  const handleReviewSubmit = async (rating: number, comment: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to submit a review",
        variant: "destructive"
      });
      return false;
    }

    if (!business) {
      toast({
        title: "Error",
        description: "Business not found",
        variant: "destructive"
      });
      return false;
    }

    try {
      // Get user profile for reviewer name
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('first_name, last_name, email')
        .eq('id', user.id)
        .single();

      const reviewerName = userProfile 
        ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || 'Anonymous'
        : 'Anonymous';

      const { error } = await supabase
        .from('business_reviews')
        .insert({
          business_id: business.id,
          user_id: user.id,
          reviewer_name: reviewerName,
          reviewer_email: userProfile?.email,
          rating: rating,
          comment: comment.trim() || null,
          status: 'pending'
        });

      if (error) {
        console.error('Error submitting review:', error);
        toast({
          title: "Error",
          description: "Failed to submit review. Please try again.",
          variant: "destructive"
        });
        return false;
      }

      toast({
        title: "Review Submitted",
        description: "Thank you for your feedback! Your review will appear after moderation.",
        variant: "default"
      });

      return true;
    } catch (error) {
      console.error('Exception submitting review:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  };
  
  // Handle enquiry submission
  const handleEnquirySubmit = async () => {
    if (!business) return;
    
    if (!enquiryFormData.name.trim() || !enquiryFormData.email.trim() || !enquiryFormData.message.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Get vet_partner_id if exists
      const { data: vetPartner } = await supabase
        .from('vet_partners' as any)
        .select('id')
        .eq('business_id', business.id)
        .maybeSingle();

      const { error } = await supabase
        .from('vet_partner_enquiries' as any)
        .insert({
          business_id: business.id,
          vet_partner_id: (vetPartner as any)?.id || null,
          user_id: user?.id || null,
          name: enquiryFormData.name.trim(),
          email: enquiryFormData.email.trim(),
          phone: enquiryFormData.phone.trim() || null,
          message: enquiryFormData.message.trim(),
        });

      if (error) throw error;

      // Notify team inbox (same route as Contact Us — Resend → dogquestireland@gmail.com by default)
      const emailNotify = await sendBusinessEnquiryEmail({
        businessName: business.name,
        businessId: business.id,
        name: enquiryFormData.name.trim(),
        email: enquiryFormData.email.trim(),
        phone: enquiryFormData.phone.trim() || undefined,
        message: enquiryFormData.message.trim(),
        listingType: business.type,
      });
      if (!emailNotify.success) {
        console.warn('Business enquiry saved but email notify failed:', emailNotify.message);
      }

      // Check if business is vet-related
      const isVetBusiness = business.type && (
        business.type.toLowerCase().includes('vet') ||
        business.type.toLowerCase().includes('veterinary') ||
        business.type.toLowerCase().includes('emergency animal care')
      );

      toast({
        title: "Enquiry Sent",
        description: isVetBusiness 
          ? "Your enquiry has been sent successfully. The vet partner will get back to you soon."
          : "Your enquiry has been sent successfully. The business will get back to you soon.",
        variant: "default"
      });

      setEnquiryFormOpen(false);
      setEnquiryFormData({ name: '', email: '', phone: '', message: '' });
    } catch (error: any) {
      console.error('Error submitting enquiry:', error);
      toast({
        title: "Error",
        description: "Failed to send enquiry. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleReplySubmit = async (reviewId: string) => {
    const replyText = replyForms[reviewId]?.text?.trim();
    
    if (!replyText) {
      toast({
        title: "Validation Error",
        description: "Please enter a reply.",
        variant: "destructive"
      });
      return;
    }

    if (!business) return;

    try {
      // Get vet_partner_id if exists
      const { data: vetPartner } = await supabase
        .from('vet_partners' as any)
        .select('id')
        .eq('business_id', business.id)
        .maybeSingle();

      const { error } = await supabase
        .from('vet_partner_review_replies' as any)
        .insert({
          review_id: reviewId,
          business_id: business.id,
          vet_partner_id: (vetPartner as any)?.id || null,
          reply_text: replyText,
        });

      if (error) throw error;

      toast({
        title: "Reply Posted",
        description: "Your reply has been posted successfully.",
        variant: "default"
      });

      // Close reply form and clear text
      setReplyForms({ ...replyForms, [reviewId]: { open: false, text: '' } });

      // Refresh reviews to show the new reply
      const fetchReviews = async () => {
        if (!business?.id) return;
        
        setIsLoadingReviews(true);
        try {
          const { data, error } = await supabase
            .from('business_reviews')
            .select(`
              *,
              vet_partner_review_replies (
                id,
                reply_text,
                created_at
              )
            `)
            .eq('business_id', business.id)
            .eq('status', 'approved')
            .order('created_at', { ascending: false });

          if (error) throw error;
          setBusinessReviews(data || []);
        } catch (error: any) {
          console.error('Error fetching reviews:', error);
        } finally {
          setIsLoadingReviews(false);
        }
      };
      
      fetchReviews();
    } catch (error: any) {
      console.error('Error submitting reply:', error);
      toast({
        title: "Error",
        description: "Failed to post reply. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Star rating component
  const StarRating = ({ rating, size = 16 }: { rating: number, size?: number }) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map(star => (
          <Star
            key={star}
            className={cn(
              "h-[1em] w-[1em]",
              star <= rating ? "fill-amber-400 text-amber-400" : "text-gray-300"
            )}
            style={{ fontSize: size }}
          />
        ))}
      </div>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl overflow-x-hidden">
        <div className="animate-pulse space-y-4">
          <div className="h-64 bg-gray-200 rounded-lg w-full"></div>
          <div className="h-10 bg-gray-200 rounded w-3/4"></div>
          <div className="h-6 bg-gray-200 rounded w-1/2"></div>
          <div className="h-40 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    );
  }

  // Business not found
  if (!business) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl overflow-x-hidden">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Business Not Found</h1>
          <p className="text-gray-600 mb-6">The business you're looking for doesn't exist or may have been removed.</p>
          <Link href="/services">
            <Button className="bg-brand-dark-green hover:bg-brand-soft-green">
              Back to Services
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Format directions URL for Google Maps (include eircode when set for clearer routing)
  const getDirectionsUrl = () => {
    const eir = business.eircode?.trim();
    const parts = [business.address, eir, business.county, 'Ireland'].filter(Boolean) as string[];
    const destination = parts.join(', ');
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
  };

  // Check if business is in wishlist
  const isFavorite = isInWishlist(business.id.toString());

  // Parse social media data
  const socialData = business.social || {};

  // Parse opening hours data
  const openingHours = business.opening_hours || [];

  // Format opening hours for display
  const formatOpeningHours = (hours: any[]): any[] => {
    if (!hours || hours.length === 0) return [];
    
    return hours.map((schedule: any) => {
      // If it already has a 'hours' property (legacy format), return as is
      if (schedule.hours) {
        return schedule;
      }
      
      // Format from new format: {day, isClosed, is24Hours, openTime, closeTime}
      let hoursDisplay = '';
      
      if (schedule.isClosed) {
        hoursDisplay = 'Closed';
      } else if (schedule.is24Hours) {
        hoursDisplay = '24 Hours';
      } else if (schedule.openTime && schedule.closeTime) {
        hoursDisplay = `${schedule.openTime} - ${schedule.closeTime}`;
      } else {
        hoursDisplay = 'Closed';
      }
      
      return {
        day: schedule.day,
        hours: hoursDisplay
      };
    });
  };

  const formattedOpeningHours = formatOpeningHours(openingHours);

  return (
    <>

      {/* WishlistAuthModal */}
      <WishlistAuthModal
        open={wishlistAuthModalOpen}
        onOpenChange={setWishlistAuthModalOpen}
        itemToSave={pendingWishlistItem || undefined}
      />

      {/* ReviewForm */}
      <ReviewForm
        open={reviewFormOpen}
        onOpenChange={setReviewFormOpen}
        sellerId={business.id}
        onSubmit={handleReviewSubmit}
      />

      {/* Enquiry Form Dialog */}
      <Dialog open={enquiryFormOpen} onOpenChange={setEnquiryFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact {business.name}</DialogTitle>
            <DialogDescription>
              {(() => {
                const isVetBusiness = business.type && (
                  business.type.toLowerCase().includes('vet') ||
                  business.type.toLowerCase().includes('veterinary') ||
                  business.type.toLowerCase().includes('emergency animal care')
                );
                return isVetBusiness
                  ? "Send an enquiry to this vet partner. They will respond to you directly."
                  : "Send an enquiry to this business. They will respond to you directly.";
              })()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="enquiry-name">Name <span className="text-red-500">*</span></Label>
              <Input
                id="enquiry-name"
                value={enquiryFormData.name}
                onChange={(e) => setEnquiryFormData({ ...enquiryFormData, name: e.target.value })}
                placeholder="Your name"
              />
            </div>
            <div>
              <Label htmlFor="enquiry-email">Email <span className="text-red-500">*</span></Label>
              <Input
                id="enquiry-email"
                type="email"
                value={enquiryFormData.email}
                onChange={(e) => setEnquiryFormData({ ...enquiryFormData, email: e.target.value })}
                placeholder="your.email@example.com"
              />
            </div>
            <div>
              <Label htmlFor="enquiry-phone">Phone (Optional)</Label>
              <Input
                id="enquiry-phone"
                type="tel"
                value={enquiryFormData.phone}
                onChange={(e) => setEnquiryFormData({ ...enquiryFormData, phone: e.target.value })}
                placeholder="Your phone number"
              />
            </div>
            <div>
              <Label htmlFor="enquiry-message">Message <span className="text-red-500">*</span></Label>
              <Textarea
                id="enquiry-message"
                value={enquiryFormData.message}
                onChange={(e) => setEnquiryFormData({ ...enquiryFormData, message: e.target.value })}
                placeholder="Your message..."
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnquiryFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEnquirySubmit} className="bg-brand-dark-green hover:bg-brand-soft-green">
              Send Enquiry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Back Button - Mobile Only */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 md:hidden max-w-7xl">
        <Link href="/services" className="inline-flex items-center text-brand-dark-green hover:text-brand-soft-green">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Services
        </Link>
      </div>

      {/* Hero Banner Section - Facebook Style (cover above details) */}
      <section className="w-full overflow-hidden">
        {/* Cover Banner - Full width of screen */}
        <div className="relative w-full h-44 sm:h-52 md:h-64 lg:h-72 bg-gray-200">
          {business.banner_image ? (
            <>
              <img 
                src={business.banner_image} 
                alt={business.name}
                className="w-full h-full object-cover"
              />
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-brand-dark-green to-brand-soft-green"></div>
          )}
        </div>
        
        {/* Profile Info Section — stacked on mobile, avatar-left on sm+ */}
        <div className="bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative max-w-7xl min-w-0">
            {/* Mobile: centered avatar + full-width title (no horizontal squeeze) */}
            <div className="flex flex-col items-center pt-2 pb-4 sm:hidden">
              <div className="-mt-10 z-10">
                <Avatar className="h-20 w-20 border-4 border-white shadow-md bg-white">
                  {business.logo_image ? (
                    <AvatarImage src={business.logo_image} alt={business.name} className="object-cover" />
                  ) : (
                    <AvatarFallback className="bg-brand-soft-green text-white text-2xl">
                      {business.name.charAt(0)}
                    </AvatarFallback>
                  )}
                </Avatar>
              </div>
              <div className="mt-3 w-full min-w-0 px-1 text-center">
                <div className="flex flex-col items-center gap-2">
                  <h1 className="text-xl font-berkshire text-gray-900 leading-tight break-words max-w-full">
                    {business.name}
                  </h1>
                  {business.partner && <PartnerBadge />}
                </div>
                <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 mt-2 text-gray-600 text-sm">
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
                      <span className="font-mono text-xs tracking-wide break-all">
                        {formatEircodeForDisplay(business.eircode)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* sm+: avatar overlaps banner edge */}
            <div className="hidden sm:block">
              <div className="absolute left-4 sm:left-6 md:left-8 -top-10 sm:-top-12 md:-top-14 z-10">
                <Avatar className="h-24 w-24 sm:h-24 sm:w-24 md:h-32 md:w-32 border-4 border-white shadow-md bg-white">
                  {business.logo_image ? (
                    <AvatarImage src={business.logo_image} alt={business.name} className="object-cover" />
                  ) : (
                    <AvatarFallback className="bg-brand-soft-green text-white text-2xl md:text-3xl">
                      {business.name.charAt(0)}
                    </AvatarFallback>
                  )}
                </Avatar>
              </div>

              <div className="pt-4 md:pt-5 pb-4 pl-28 sm:pl-28 md:pl-36 pr-4 sm:pr-6 min-w-0">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-berkshire text-gray-900 leading-tight break-words min-w-0">
                    {business.name}
                  </h1>
                  {business.partner && (
                    <PartnerBadge />
                  )}
                </div>

                <div className="flex items-center gap-2 mt-1 text-gray-600 text-sm md:text-base flex-wrap min-w-0">
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
                      <span className="font-mono text-xs sm:text-sm tracking-wide break-all">
                        {formatEircodeForDisplay(business.eircode)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Divider */}
          <div className="border-t border-gray-200"></div>
        </div>
      </section>

      {/* Active Promotion Banner */}
      {activePromotion && (
        <section className="w-full bg-gradient-to-r from-brand-soft-green to-brand-light-green py-4">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl overflow-x-hidden">
            {activePromotion.banner_image_url ? (
              <div className="relative rounded-lg overflow-hidden">
                <img
                  src={activePromotion.banner_image_url}
                  alt={activePromotion.title}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <div className="text-center text-white p-4">
                    <h2 className="text-2xl font-bold mb-2">{activePromotion.title}</h2>
                    {activePromotion.description && (
                      <p className="text-lg">{activePromotion.description}</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-center">
                <h2 className="text-2xl font-bold text-white mb-2">{activePromotion.title}</h2>
                {activePromotion.description && (
                  <p className="text-white/90">{activePromotion.description}</p>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Main Content Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl overflow-x-hidden">
        <div className="grid md:grid-cols-3 gap-6 md:gap-8 min-w-0">
          {/* Main Content Column */}
          <div className="md:col-span-2 space-y-8 min-w-0">
            {/* Tabs for different sections on mobile */}
            <Tabs defaultValue="info" className="md:hidden w-full min-w-0">
              <TabsList className={cn(
                "w-full h-auto min-h-10 p-1",
                isPaidPartner ? "grid grid-cols-2 mb-6" : "grid grid-cols-1 mb-6"
              )}>
                <TabsTrigger value="info">Information</TabsTrigger>
                {isPaidPartner && <TabsTrigger value="reviews">Reviews</TabsTrigger>}
              </TabsList>
              
              {/* About Us Button for Mobile - Only for Premium/Elite */}
              {isPaidPartner && (
                <div className="mb-6">
                  <Button 
                    className="w-full bg-white border border-brand-dark-green text-brand-dark-green hover:bg-brand-soft-green hover:text-white gap-2"
                    asChild
                  >
                    <Link href={`/services/${business.slug}/about`}>
                      <Info className="h-4 w-4" />
                      About Us
                    </Link>
                  </Button>
                </div>
              )}
              
              <TabsContent value="info" className="space-y-8 min-w-0">
                {/* Business Info Card */}
                <Card className="min-w-0 overflow-hidden">
                  <CardContent className="p-4 sm:p-6 min-w-0">
                    <h2 className="font-berkshire text-xl text-brand-dark-green mb-4 break-words">About {business.name}</h2>
                    <p className="text-gray-700 mb-6 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{business.description}</p>
                    
                    <div className="space-y-4">
                      {/* Address */}
                      <div className="flex items-start gap-3 min-w-0">
                        <MapPin className="h-5 w-5 text-brand-dark-green flex-shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <h3 className="font-medium">Address</h3>
                          <p className="text-sm text-gray-600 break-words [overflow-wrap:anywhere]">{business.address}, {business.county}</p>
                          {formatEircodeForDisplay(business.eircode) && (
                            <p className="text-sm text-gray-600 mt-1">
                              <span className="font-medium text-gray-800">Eircode</span>{' '}
                              <span className="font-mono tracking-wide break-all">
                                {formatEircodeForDisplay(business.eircode)}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Phone */}
                      <div className="flex items-start gap-3 min-w-0">
                        <Phone className="h-5 w-5 text-brand-dark-green flex-shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <h3 className="font-medium">Phone</h3>
                          <p className="text-sm text-gray-600">
                            <a href={`tel:${business.phone}`} className="hover:text-brand-soft-green break-all">
                              {business.phone}
                            </a>
                          </p>
                        </div>
                      </div>
                      
                      {/* Email - Always show when available */}
                      {business.email && (
                        <div className="flex items-start gap-3 min-w-0">
                          <Mail className="h-5 w-5 text-brand-dark-green flex-shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <h3 className="font-medium">Email</h3>
                            <p className="text-sm text-gray-600">
                              <a href={`mailto:${business.email}`} className="hover:text-brand-soft-green break-all">
                                {business.email}
                              </a>
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {/* Website */}
                      {business.website && (
                        <div className="flex items-start gap-3 min-w-0">
                          <Globe className="h-5 w-5 text-brand-dark-green flex-shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <h3 className="font-medium">Website</h3>
                            <p className="text-sm text-gray-600">
                              <a 
                                href={business.website} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="hover:text-brand-soft-green inline-flex items-center flex-wrap gap-1"
                              >
                                Visit Website
                                <ArrowUpRight className="ml-1 h-3 w-3 shrink-0" />
                              </a>
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {/* Social Media - For all vet partners */}
                      {business.partner && (socialData.facebook || socialData.instagram || socialData.tiktok) && (
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="h-5 w-5 text-brand-dark-green flex-shrink-0 mt-0.5">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-medium">Social Media</h3>
                            <div className="flex flex-wrap gap-4 mt-2">
                              {socialData.facebook && (
                                <a href={socialData.facebook} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                                  <FacebookIcon />
                                </a>
                              )}
                              {socialData.instagram && (
                                <a href={socialData.instagram} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                                  <Instagram className="h-5 w-5 text-[#E4405F]" />
                                </a>
                              )}
                              {socialData.tiktok && (
                                <a href={socialData.tiktok} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                                  <TikTokIcon />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Contact Form - Only for paid partners */}
                      {isPaidPartner && (
                        <div className="flex items-start gap-3 mt-6 min-w-0">
                          <Mail className="h-5 w-5 text-brand-dark-green flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium mb-2">Send Enquiry</h3>
                            <Button 
                              onClick={() => setEnquiryFormOpen(true)}
                              className="w-full bg-brand-dark-green hover:bg-brand-soft-green"
                            >
                              {business.partner ? "Contact This Partner" : "Contact This Business"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                
                {/* Opening Hours Card */}
                {openingHours && openingHours.length > 0 && (
                  <Card className="min-w-0 overflow-hidden">
                    <CardContent className="p-4 sm:p-6 min-w-0">
                      <div className="flex items-center gap-2 mb-4">
                        <Clock className="h-5 w-5 text-brand-dark-green shrink-0" />
                        <h2 className="font-berkshire text-xl text-brand-dark-green">Opening Hours</h2>
                      </div>
                      
                      <div className="space-y-2">
                        {formattedOpeningHours.map((schedule: any, index: number) => (
                          <div 
                            key={index} 
                            className={cn(
                              "flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:items-start sm:gap-4 py-2 min-w-0",
                              index !== formattedOpeningHours.length - 1 && "border-b border-gray-100"
                            )}
                          >
                            <span className="font-medium shrink-0">{schedule.day}</span>
                            <span className={cn(
                              "text-gray-700 sm:text-right break-words min-w-0",
                              schedule.hours === "Closed" && "text-red-500",
                              schedule.hours === "24 Hours" && "text-green-600"
                            )}>
                              {schedule.hours}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
              
              {isPaidPartner && (
              <TabsContent value="reviews" className="space-y-8 min-w-0">
                {/* Reviews Card */}
                <Card className="min-w-0 overflow-hidden">
                  <CardContent className="p-4 sm:p-6 min-w-0">
                    <div className="flex items-center justify-between mb-6 gap-4 min-w-0">
                      <div className="flex flex-col min-w-0">
                        <h2 className="font-berkshire text-xl text-brand-dark-green">Reviews</h2>
                        {business.reviews > 0 && (
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 min-w-0">
                            <StarRating rating={Math.round(business.rating)} size={16} />
                            <span className="text-sm text-gray-600 break-words">
                              {business.rating.toFixed(1)} based on {business.reviews} reviews
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {businessReviews && businessReviews.length > 0 ? (
                      <div className="space-y-4 max-h-96 overflow-y-auto pr-2 min-w-0">
                        {businessReviews.map((review: any) => (
                          <div key={review.id} className="border border-gray-100 rounded-lg p-4 min-w-0">
                            <div className="flex justify-between items-start mb-2 gap-2 min-w-0">
                              <div className="min-w-0">
                                <h3 className="font-medium break-words">{review.reviewer_name}</h3>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                  <StarRating rating={review.rating} size={12} />
                                  <span className="text-xs text-gray-500">
                                    {new Date(review.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            {review.comment && (
                              <p className="text-sm text-gray-600 mt-3 break-words [overflow-wrap:anywhere]">{review.comment}</p>
                            )}
                            
                            {/* Show replies */}
                            {review.vet_partner_review_replies && review.vet_partner_review_replies.length > 0 && (
                              <div className="mt-4 pl-4 border-l-2 border-brand-soft-green">
                                {review.vet_partner_review_replies.map((reply: any) => (
                                  <div key={reply.id} className="mt-3">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Badge variant="outline" className="text-xs">Partner Response</Badge>
                                      <span className="text-xs text-gray-500">
                                        {new Date(reply.created_at).toLocaleDateString()}
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-700 break-words [overflow-wrap:anywhere]">{reply.reply_text}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {/* Reply button for paid partners who own the business */}
                            {isPaidPartner && isBusinessOwner && (
                              <div className="mt-3">
                                {!replyForms[review.id]?.open ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setReplyForms({ ...replyForms, [review.id]: { open: true, text: '' } })}
                                  >
                                    Reply
                                  </Button>
                                ) : (
                                  <div className="space-y-2">
                                    <Textarea
                                      value={replyForms[review.id]?.text || ''}
                                      onChange={(e) => setReplyForms({ ...replyForms, [review.id]: { open: true, text: e.target.value } })}
                                      placeholder="Write a reply..."
                                      rows={3}
                                    />
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        onClick={() => handleReplySubmit(review.id)}
                                        className="bg-brand-dark-green hover:bg-brand-soft-green"
                                      >
                                        Post Reply
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setReplyForms({ ...replyForms, [review.id]: { open: false, text: '' } })}
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 border border-dashed border-gray-200 rounded-lg">
                        <p className="text-gray-500">No reviews yet. Be the first to leave a review!</p>
                      </div>
                    )}
                    
                    {/* Write Review Button */}
                    <div className="mt-8 pt-6 border-t border-gray-100">
                      <Button 
                        onClick={() => setReviewFormOpen(true)}
                        className="w-full bg-brand-dark-green hover:bg-brand-soft-green gap-2"
                      >
                        <Pencil className="h-4 w-4" />
                        Write a Review
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              )}
            </Tabs>

            {/* Desktop Info and Reviews (stacked) */}
            <div className="hidden md:block space-y-8 min-w-0">
              {/* Business Info Card */}
              <Card className="min-w-0 overflow-hidden">
                <CardContent className="p-6 min-w-0">
                  <h2 className="font-berkshire text-xl text-brand-dark-green mb-4 break-words">About {business.name}</h2>
                  <p className="text-gray-700 mb-6 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{business.description}</p>
                  
                  <div className="grid sm:grid-cols-2 gap-6 min-w-0">
                    <div className="space-y-4 min-w-0">
                      {/* Address */}
                      <div className="flex items-start gap-3 min-w-0">
                        <MapPin className="h-5 w-5 text-brand-dark-green flex-shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <h3 className="font-medium">Address</h3>
                          <p className="text-sm text-gray-600 break-words [overflow-wrap:anywhere]">{business.address}, {business.county}</p>
                          {formatEircodeForDisplay(business.eircode) && (
                            <p className="text-sm text-gray-600 mt-1">
                              <span className="font-medium text-gray-800">Eircode</span>{' '}
                              <span className="font-mono tracking-wide break-all">
                                {formatEircodeForDisplay(business.eircode)}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Phone */}
                      <div className="flex items-start gap-3 min-w-0">
                        <Phone className="h-5 w-5 text-brand-dark-green flex-shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <h3 className="font-medium">Phone</h3>
                          <p className="text-sm text-gray-600">
                            <a href={`tel:${business.phone}`} className="hover:text-brand-soft-green break-all">
                              {business.phone}
                            </a>
                          </p>
                        </div>
                      </div>
                      
                      {/* Email - Always show when available */}
                      {business.email && (
                        <div className="flex items-start gap-3 min-w-0">
                          <Mail className="h-5 w-5 text-brand-dark-green flex-shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <h3 className="font-medium">Email</h3>
                            <p className="text-sm text-gray-600">
                              <a href={`mailto:${business.email}`} className="hover:text-brand-soft-green break-all">
                                {business.email}
                              </a>
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-4 min-w-0">
                      {/* Website */}
                      {business.website && (
                        <div className="flex items-start gap-3 min-w-0">
                          <Globe className="h-5 w-5 text-brand-dark-green flex-shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <h3 className="font-medium">Website</h3>
                            <p className="text-sm text-gray-600">
                              <a 
                                href={business.website} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="hover:text-brand-soft-green inline-flex items-center flex-wrap gap-1"
                              >
                                Visit Website
                                <ArrowUpRight className="ml-1 h-3 w-3 shrink-0" />
                              </a>
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {/* Social Media - For all vet partners */}
                      {business.partner && (socialData.facebook || socialData.instagram || socialData.tiktok) && (
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="h-5 w-5 text-brand-dark-green flex-shrink-0 mt-0.5">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-medium">Social Media</h3>
                            <div className="flex flex-wrap gap-4 mt-2">
                              {socialData.facebook && (
                                <a href={socialData.facebook} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                                  <FacebookIcon />
                                </a>
                              )}
                              {socialData.instagram && (
                                <a href={socialData.instagram} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                                  <Instagram className="h-5 w-5 text-[#E4405F]" />
                                </a>
                              )}
                              {socialData.tiktok && (
                                <a href={socialData.tiktok} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                                  <TikTokIcon />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Contact Form - Only for paid partners */}
                      {isPaidPartner && (
                        <div className="flex items-start gap-3 mt-6 min-w-0">
                          <Mail className="h-5 w-5 text-brand-dark-green flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium mb-2">Send Enquiry</h3>
                            <Button 
                              onClick={() => setEnquiryFormOpen(true)}
                              className="w-full bg-brand-dark-green hover:bg-brand-soft-green"
                            >
                              {business.partner ? "Contact This Partner" : "Contact This Business"}
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      {/* Partner Badge */}
                      {business.partner && (
                        <div className="flex items-start gap-3 mt-6 min-w-0">
                          <BadgeCheck className="h-5 w-5 text-brand-dark-green flex-shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <h3 className="font-medium">Partner Status</h3>
                            <div className="mt-2">
                              <PartnerBadge />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Reviews Card - Only for paid partners */}
              {isPaidPartner && (
              <Card className="min-w-0 overflow-hidden">
                <CardContent className="p-6 min-w-0">
                  <div className="flex items-center justify-between mb-6 gap-4 min-w-0">
                    <div className="flex flex-col min-w-0">
                      <h2 className="font-berkshire text-xl text-brand-dark-green">Reviews</h2>
                      {business.reviews > 0 && (
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 min-w-0">
                          <StarRating rating={Math.round(business.rating)} size={18} />
                          <span className="text-sm text-gray-600 break-words">
                            {business.rating.toFixed(1)} based on {business.reviews} reviews
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {businessReviews && businessReviews.length > 0 ? (
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 min-w-0">
                      {businessReviews.map((review: any) => (
                        <div key={review.id} className="border border-gray-100 rounded-lg p-4 min-w-0">
                          <div className="flex justify-between items-start mb-2 gap-2 min-w-0">
                            <div className="min-w-0">
                              <h3 className="font-medium break-words">{review.reviewer_name}</h3>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <StarRating rating={review.rating} size={14} />
                                <span className="text-xs text-gray-500">
                                  {new Date(review.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {review.comment && (
                            <p className="text-sm text-gray-600 mt-3 break-words [overflow-wrap:anywhere]">{review.comment}</p>
                          )}
                          
                          {/* Show replies */}
                          {review.vet_partner_review_replies && review.vet_partner_review_replies.length > 0 && (
                            <div className="mt-4 pl-4 border-l-2 border-brand-soft-green">
                              {review.vet_partner_review_replies.map((reply: any) => (
                                <div key={reply.id} className="mt-3">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline" className="text-xs">Partner Response</Badge>
                                    <span className="text-xs text-gray-500">
                                      {new Date(reply.created_at).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-700 break-words [overflow-wrap:anywhere]">{reply.reply_text}</p>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* Reply button for paid partners who own the business */}
                          {isPaidPartner && isBusinessOwner && (
                            <div className="mt-3">
                              {!replyForms[review.id]?.open ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setReplyForms({ ...replyForms, [review.id]: { open: true, text: '' } })}
                                >
                                  Reply
                                </Button>
                              ) : (
                                <div className="space-y-2">
                                  <Textarea
                                    value={replyForms[review.id]?.text || ''}
                                    onChange={(e) => setReplyForms({ ...replyForms, [review.id]: { open: true, text: e.target.value } })}
                                    placeholder="Write a reply..."
                                    rows={3}
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => handleReplySubmit(review.id)}
                                      className="bg-brand-dark-green hover:bg-brand-soft-green"
                                    >
                                      Post Reply
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setReplyForms({ ...replyForms, [review.id]: { open: false, text: '' } })}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 border border-dashed border-gray-200 rounded-lg">
                      <p className="text-gray-500">No reviews yet. Be the first to leave a review!</p>
                    </div>
                  )}
                  
                  {/* Write Review Button */}
                  <div className="mt-8 pt-6 border-t border-gray-100">
                    <Button 
                      onClick={() => setReviewFormOpen(true)}
                      className="w-full bg-brand-dark-green hover:bg-brand-soft-green gap-2"
                    >
                      <Pencil className="h-4 w-4" />
                      Write a Review
                    </Button>
                  </div>
                </CardContent>
              </Card>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6 min-w-0">
            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <Button 
                  className={cn(
                    "flex-1 gap-2",
                    isFavorite 
                      ? "bg-red-50 text-red-500 border border-red-200 hover:bg-red-100" 
                      : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                  )}
                  onClick={handleToggleWishlist}
                >
                  <Heart className={cn("h-4 w-4", isFavorite && "fill-red-500")} />
                  {isFavorite ? "Saved" : "Save"}
                </Button>
                
                <Button 
                  className="flex-1 bg-brand-dark-green hover:bg-brand-soft-green gap-2"
                  asChild
                >
                  <a href={getDirectionsUrl()} target="_blank" rel="noopener noreferrer">
                    <MapPinIcon className="h-4 w-4" />
                    Directions
                  </a>
                </Button>
              </div>
              
              {/* About Us Button - Only for Premium/Elite */}
              {isPaidPartner && (
                <Button 
                  className="w-full bg-white border border-brand-dark-green text-brand-dark-green hover:bg-brand-soft-green hover:text-white gap-2"
                  asChild
                >
                  <Link href={`/services/${business.slug}/about`}>
                    <Info className="h-4 w-4" />
                    About Us
                  </Link>
                </Button>
              )}
            </div>
            
            {/* Map Card */}
            <Card className="overflow-hidden">
              <div className="h-[50vh] bg-gray-100 relative">
                <ServicesMap
                  businesses={businessForMap}
                  hoveredBusinessId={hoveredBusinessId}
                  setHoveredBusiness={setHoveredBusinessId}
                  userLocation={null}
                />
                
                {/* Get Directions Button */}
                <div className="absolute bottom-4 right-4 z-10">
                  <Button 
                    size="sm" 
                    className="bg-white text-brand-dark-green hover:bg-gray-100 shadow-md"
                    asChild
                  >
                    <a href={getDirectionsUrl()} target="_blank" rel="noopener noreferrer">
                      Get Directions
                    </a>
                  </Button>
                </div>
              </div>
              
              <CardContent className="p-4 min-w-0">
                <h3 className="font-medium mb-1">Location</h3>
                <p className="text-sm text-gray-600 break-words [overflow-wrap:anywhere]">{business.address}, {business.county}</p>
                {formatEircodeForDisplay(business.eircode) && (
                  <p className="text-sm text-gray-600 mt-2">
                    <span className="font-medium text-gray-800">Eircode</span>{' '}
                    <span className="font-mono tracking-wide break-all">
                      {formatEircodeForDisplay(business.eircode)}
                    </span>
                  </p>
                )}
              </CardContent>
            </Card>
            
            {/* Opening Hours Card for Desktop */}
            {openingHours && openingHours.length > 0 && (
              <Card className="hidden md:block min-w-0 overflow-hidden">
                <CardContent className="p-4 min-w-0">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="h-5 w-5 text-brand-dark-green shrink-0" />
                    <h3 className="font-medium">Opening Hours</h3>
                  </div>
                  
                  <div className="space-y-1.5">
                    {formattedOpeningHours.map((schedule: any, index: number) => (
                      <div 
                        key={index} 
                        className={cn(
                          "flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:items-start sm:gap-2 py-1 text-sm min-w-0",
                          index !== formattedOpeningHours.length - 1 && "border-b border-gray-100"
                        )}
                      >
                        <span className="shrink-0 font-medium">{schedule.day}</span>
                        <span className={cn(
                          "text-gray-700 sm:text-right break-words min-w-0",
                          schedule.hours === "Closed" && "text-red-500",
                          schedule.hours === "24 Hours" && "text-green-600"
                        )}>
                          {schedule.hours}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>

      {/* Marketplace Products Carousel - Only show for Elite Marketplace businesses */}
      {hasPremiumOrElite && marketplaceProducts.length > 0 && (
        <section className="py-12 bg-gray-50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl overflow-x-hidden">
            <div className="mb-6">
              <h2 className="text-2xl md:text-3xl font-berkshire text-brand-dark-green mb-2">
                Products By {business?.name}
              </h2>
              <p className="text-gray-600">Browse products from this business</p>
              {business?.refund_policy && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-sm text-blue-900 mb-2">Refund Policy</h3>
                  <p className="text-sm text-blue-800">{business.refund_policy}</p>
                </div>
              )}
            </div>
            
            <Carousel
              opts={{
                align: 'start',
                loop: false,
                dragFree: true,
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-4">
                {marketplaceProducts.map((product: any) => {
                  const productImage = (product.images && Array.isArray(product.images) && product.images[0]) || product.image_url;
                  const displayPrice = product.sale_price || product.price;
                  const originalPrice = product.sale_price ? product.price : null;
                  
                  return (
                    <CarouselItem key={product.id} className="pl-4 basis-[85%] sm:basis-[45%] md:basis-[33%] lg:basis-[25%]">
                      <Card className="h-full overflow-hidden border-2 border-gray-100 transition-all duration-200 hover:shadow-md hover:border-brand-light-green flex flex-col">
                        <Link href={`/shop/marketplace-${product.id}`} className="block flex-grow">
                          <div className="relative overflow-hidden">
                            <div className="aspect-square overflow-hidden bg-gray-100 flex items-center justify-center">
                              <img
                                src={productImage || '/placeholder.svg'}
                                alt={product.name}
                                className="h-full w-full object-contain transition-transform duration-300 hover:scale-105"
                              />
                            </div>
                            
                            <div className="absolute top-3 left-3 flex flex-col gap-2">
                              <Badge
                                variant="outline"
                                className={`${(product.stock_quantity || 0) > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}
                              >
                                {(product.stock_quantity || 0) > 0 ? 'In Stock' : 'Out of Stock'}
                              </Badge>
                              {(() => {
                                const shippingCost = product.shipping_cost || 0;
                                const shippingRequired = product.shipping_required !== false;
                                if (!shippingRequired || shippingCost === 0) {
                                  return (
                                    <Badge className="bg-green-500 text-white">
                                      Free Shipping
                                    </Badge>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          </div>
                          
                          <CardContent className="p-4 flex-grow flex flex-col">
                            <h3 className="text-lg font-semibold font-berkshire text-brand-dark-green mb-1 line-clamp-2 h-[3.2rem]">
                              {product.name}
                            </h3>
                            
                            <p className="text-gray-600 text-sm mb-3 line-clamp-2 h-10">
                              {product.short_description || product.description}
                            </p>
                            
                            <div className="flex items-center gap-2 mb-4 flex-grow">
                              {originalPrice && (
                                <span className="text-sm text-gray-500 line-through">
                                  €{originalPrice.toFixed(2)}
                                </span>
                              )}
                              <span className="text-lg font-semibold text-brand-dark-green">
                                €{displayPrice.toFixed(2)}
                              </span>
                            </div>
                          </CardContent>
                        </Link>
                        
                        <div className="px-4 pb-4">
                          <Button
                            className="w-full bg-brand-soft-green hover:bg-brand-dark-green text-white"
                            onClick={(e) => {
                              e.preventDefault();
                              router.push(`/shop/marketplace-${product.id}`);
                            }}
                          >
                            <ShoppingCart className="mr-2 h-4 w-4" />
                            View Product
                          </Button>
                        </div>
                      </Card>
                    </CarouselItem>
                  );
                })}
              </CarouselContent>
              <div className="flex justify-end gap-2 mt-6">
                <CarouselPrevious className="relative static h-8 w-8" />
                <CarouselNext className="relative static h-8 w-8" />
              </div>
            </Carousel>
          </div>
        </section>
      )}
    </>
  );
};

export default ServiceDetail;
