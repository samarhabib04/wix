'use client';

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import ReviewForm from "@/components/user/ReviewForm";
import Review, { ReviewData } from "@/components/user/Review";
import { Separator } from "@/components/ui/separator";
import NavigationSection from "@/components/NavigationSection";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useSellerReservations } from "@/hooks/use-seller-reservations";

const UserProfile = () => {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const { user } = useAuth();
  
  // Fetch user data from Supabase
  const { data: userProfile, isLoading, error } = useQuery({
    queryKey: ["user-profile", id],
    queryFn: async () => {
      if (!id) throw new Error("User ID is required");

      // 1) get_public_directory_user_profile: directory-safe fields for buyer/seller/business (RPC bypasses RLS).
      // 2) Fallback user_profiles: own profile, admin, or roles excluded from the directory RPC (e.g. admin).
      const publicFields =
        "id, first_name, last_name, role, county, business_name, created_at, avatar_url" as const;

      const { data: rpcRow, error: rpcError } = await supabase.rpc(
        "get_public_directory_user_profile",
        { p_user_id: id }
      );

      if (rpcError) {
        console.error("Error fetching public directory user profile:", rpcError);
        throw rpcError;
      }

      const rpcObj = rpcRow as Record<string, unknown> | null;
      const hasRpcProfile =
        rpcObj &&
        typeof rpcObj.id === "string" &&
        rpcObj.id.length > 0;

      let data = hasRpcProfile
        ? {
            id: rpcObj.id as string,
            first_name: rpcObj.first_name as string | null,
            last_name: rpcObj.last_name as string | null,
            role: rpcObj.role as string | null,
            county: rpcObj.county as string | null,
            business_name: rpcObj.business_name as string | null,
            created_at: rpcObj.created_at as string | null,
            avatar_url: rpcObj.avatar_url as string | null,
          }
        : null;

      if (!data?.id) {
        const { data: privateRow, error: privateError } = await supabase
          .from("user_profiles")
          .select(publicFields)
          .eq("id", id)
          .maybeSingle();

        if (privateError) {
          console.error("Error fetching user profile (fallback):", privateError);
          throw privateError;
        }
        data = privateRow;
      }

      if (!data?.id) {
        throw new Error("User not found");
      }

      // Transform the data to match the expected format
      const fullName = `${data.first_name || ""} ${data.last_name || ""}`.trim();
      const displayRole = data.role === "business" ? "Business" : 
                         data.role === "seller" ? "Seller" : 
                         data.role === "buyer" ? "Buyer" : 
                         data.role === "admin" ? "Admin" : "User";
      
      // Create a simple bio based on role and business name
      let bio = "";
      if (data.role === "business" && data.business_name) {
        bio = `Business owner of ${data.business_name}`;
      } else if (data.role === "seller") {
        bio = "Dog seller and breeder";
      } else if (data.role === "buyer") {
        bio = "Looking for the perfect dog companion";
      } else {
        bio = "Dog Quest community member";
      }

      // Format join date
      const joinDate = data.created_at ? new Date(data.created_at).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long' 
      }) : "Unknown";

      return {
        id: data.id,
        name: fullName || "Anonymous User",
        role: displayRole,
        county: data.county || "Unknown",
        verified: data.role === "business", // Only businesses are considered "verified" for now
        avatar: data.avatar_url || "", // Include avatar URL from database
        bio: bio,
        joinDate: joinDate,
        listings: 0, // Will be calculated from actual listings
        reviewCount: 0, // Will be calculated from actual reviews
        reviewAverage: 0 // Will be calculated from actual reviews
      };
    },
    enabled: !!id
  });

  // Fetch active listings count for sellers only
  const { data: activeListingsCount = 0 } = useQuery({
    queryKey: ["user-active-listings", id],
    queryFn: async () => {
      if (!id || !userProfile || userProfile.role === "Buyer") return 0;
      
      // Fetch active listings count for this user
      const [studListings, saleListings] = await Promise.all([
        // Count stud listings
        supabase
          .from('stud_listings')
          .select('user_id')
          .eq('user_id', id)
          .eq('admin_approved', true)
          .eq('is_published', true),
        
        // Count sale listings  
        supabase
          .from('sale_listings')
          .select('seller_id')
          .eq('seller_id', id)
          .eq('admin_approved', true)
          .eq('is_published', true)
      ]);

      const studCount = studListings.data?.length || 0;
      const saleCount = saleListings.data?.length || 0;
      
      return studCount + saleCount;
    },
    enabled: !!id && !!userProfile && userProfile.role !== "Buyer"
  });

  // Fetch seller reservation statistics
  const { data: reservationStats } = useSellerReservations(
    userProfile?.role === "Seller" ? id : undefined
  );

  // Fetch user reviews from the database
  const { data: userReviews = [], isLoading: isLoadingReviews } = useQuery({
    queryKey: ["user-reviews", id],
    queryFn: async () => {
      if (!id) return [];
      
      const { data, error } = await supabase
        .from('user_reviews')
        .select('*')
        .eq('reviewed_user_id', id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user reviews:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!id
  });

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  // Handle review submission for user profiles
  const handleReviewSubmit = async (rating: number, comment: string): Promise<boolean> => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to submit a review",
        variant: "destructive"
      });
      return false;
    }

    if (!userProfile) {
      toast({
        title: "Error",
        description: "User not found",
        variant: "destructive"
      });
      return false;
    }

    try {
      // Get reviewer profile for name
      const { data: reviewerProfile } = await supabase
        .from('user_profiles')
        .select('first_name, last_name, email')
        .eq('id', user.id)
        .single();

      const reviewerName = reviewerProfile 
        ? `${reviewerProfile.first_name || ''} ${reviewerProfile.last_name || ''}`.trim() || 'Anonymous'
        : 'Anonymous';

      const { error } = await supabase
        .from('user_reviews')
        .insert({
          reviewed_user_id: userProfile.id,
          reviewer_user_id: user.id,
          reviewer_name: reviewerName,
          reviewer_email: reviewerProfile?.email,
          rating: rating,
          comment: comment.trim() || null,
          status: 'pending'
        });

      if (error) {
        console.error('Error submitting user review:', error);
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
      console.error('Exception submitting user review:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  };

  // Handle navigation to seller's listings
  const handleViewListings = () => {
    router.push(`/listings?seller=${userProfile?.id}`);
  };

  // Calculate review statistics
  const reviewCount = userReviews.length;
  const reviewAverage = reviewCount > 0 
    ? (userReviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount).toFixed(1)
    : "0";

  if (isLoading) {
    return (
      <>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-10 bg-white rounded-lg shadow-sm">
            <p className="text-gray-500">Loading user profile...</p>
          </div>
        </div>
        <NavigationSection />
      </>
    );
  }

  if (error || !userProfile) {
    return (
      <>
        <div className="container mx-auto px-4 py-8">
          <Button 
            variant="outline" 
            onClick={() => router.push('/directory')} 
            className="mb-6"
          >
            ← Back to Directory
          </Button>
          <div className="text-center py-10 bg-white rounded-lg shadow-sm">
            <p className="text-red-500">User not found or error loading profile.</p>
          </div>
        </div>
        <NavigationSection />
      </>
    );
  }

  return (
    <>
      <div className="container mx-auto px-4 py-8 pb-20">
        <Button 
          variant="outline" 
          onClick={() => router.push('/directory')} 
          className="mb-6"
        >
          ← Back to Directory
        </Button>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex flex-col items-center">
              <Avatar className="h-32 w-32 border-4 border-brand-soft-green">
                {userProfile.avatar ? (
                  <AvatarImage src={userProfile.avatar} alt={userProfile.name} />
                ) : (
                  <AvatarFallback className="bg-brand-light-green text-brand-dark-green text-4xl">
                    {getInitials(userProfile.name)}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="mt-4 flex flex-col items-center">
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={userProfile.role === "Seller" ? "bg-brand-soft-green" : userProfile.role === "Business" ? "bg-blue-500" : "bg-orange-500"}>
                    {userProfile.role}
                  </Badge>
                  {userProfile.role === "Seller" && userProfile.verified && (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      ✓ Verified
                    </Badge>
                  )}
                </div>
                <p className="text-gray-500 mt-2">{userProfile.county}</p>
                <p className="text-gray-500 text-sm mt-1">Member since {userProfile.joinDate}</p>
              </div>
            </div>
            
            <div className="flex-1">
              <h1 className="text-3xl font-berkshire mb-4">{userProfile.name}</h1>
              <p className="text-gray-700 mb-6">{userProfile.bio}</p>
              
              {/* Stats - only show Active Listings and Reservations for sellers */}
              <div className={`grid grid-cols-1 ${userProfile.role === "Seller" ? "md:grid-cols-4" : "md:grid-cols-2"} gap-4 mb-6`}>
                {userProfile.role === "Seller" && (
                  <>
                    <div className="bg-brand-light-green bg-opacity-30 p-4 rounded-lg text-center">
                      <p className="text-xl font-semibold">{activeListingsCount}</p>
                      <p className="text-sm text-gray-600">Active Listings</p>
                    </div>
                    <div className="bg-brand-light-green bg-opacity-30 p-4 rounded-lg text-center">
                      <p className="text-xl font-semibold">{reservationStats?.successfulReservations || 0}</p>
                      <p className="text-sm text-gray-600">Reservations</p>
                    </div>
                  </>
                )}
                <div className="bg-brand-light-green bg-opacity-30 p-4 rounded-lg text-center">
                  <p className="text-xl font-semibold">{reviewCount}</p>
                  <p className="text-sm text-gray-600">Reviews</p>
                </div>
                <div className="bg-brand-light-green bg-opacity-30 p-4 rounded-lg text-center">
                  <p className="text-xl font-semibold">{reviewAverage}/5</p>
                  <p className="text-sm text-gray-600">Rating</p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                {userProfile.role === "Seller" && activeListingsCount > 0 && (
                  <Button 
                    variant="outline" 
                    className="border-brand-soft-green text-brand-dark-green"
                    onClick={handleViewListings}
                  >
                    View Listings
                  </Button>
                )}
              </div>
            </div>
          </div>
          
          {/* Reviews Section - For all user types */}
          <div className="mt-10">
            <Separator className="mb-6" />
            
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold">Reviews</h2>
              {user && user.id !== userProfile.id && (
                <Button onClick={() => setReviewModalOpen(true)}>
                  Leave a Review
                </Button>
              )}
            </div>
            
            {isLoadingReviews ? (
              <p className="text-gray-500 text-center py-6">Loading reviews...</p>
            ) : userReviews.length > 0 ? (
              <div className="space-y-4">
                {userReviews.map((review) => (
                  <Review 
                    key={review.id} 
                    review={{
                      id: review.id,
                      buyerName: review.reviewer_name,
                      rating: review.rating,
                      comment: review.comment || "",
                      createdAt: new Date(review.created_at)
                    }} 
                  />
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-6">No reviews yet.</p>
            )}
          </div>
        </div>
        
        {/* Review Form Modal */}
        <ReviewForm 
          open={reviewModalOpen} 
          onOpenChange={setReviewModalOpen} 
          sellerId={userProfile.id}
          onSubmit={handleReviewSubmit}
        />
      </div>
      
      {/* Navigation help section */}
      <NavigationSection />
    </>
  );
};

export default UserProfile;

