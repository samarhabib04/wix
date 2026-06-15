'use client';

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { EditIcon, AlertCircleIcon, Plus, Loader2, Package, Clock, CheckCircle, Zap, TrendingUp, Info } from "lucide-react";
// Icons imported - Eye removed as Actions column was removed
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase/client";
import PartnerBadge from "@/components/ui/partner-badge";
import BusinessListingEditForm from "@/components/business-dashboard/BusinessListingEditForm";
import { useBusinessListingBoosts } from "@/hooks/useBusinessListingBoosts";

interface BusinessListingData {
  id: string;
  name: string;
  description: string;
  address: string;
  county: string;
  phone: string;
  website?: string | null;
  type: string;
  status: string;
  admin_approved: boolean;
  partner: boolean;
  rating: number | null;
  reviews: number | null;
  created_at: string;
  banner_image?: string | null;
  logo_image?: string | null;
  opening_hours?: any;
  social?: any;
  coordinates?: any;
  eircode?: string | null;
  about_us?: string | null;
  gallery_images?: string[] | null;
}

interface MarketplaceProduct {
  id: string;
  name: string;
  category?: string | null;
  price: number;
  sale_price?: number | null;
  stock_quantity: number;
  status: 'draft' | 'pending_approval' | 'live';
  image_url?: string | null;
  images?: string[] | null;
  created_at: string;
}

export default function BusinessListingPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const [listings, setListings] = useState<BusinessListingData[]>([]);
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [productStatusFilter, setProductStatusFilter] = useState<'all' | 'draft' | 'pending_approval' | 'live'>('all');
  const [currentBusinessId, setCurrentBusinessId] = useState<string | null>(null);
  const [hasEliteSubscription, setHasEliteSubscription] = useState(false);
  const [boostConfig, setBoostConfig] = useState<{ boost_name: string; boost_amount: number; currency: string } | null>(null);
  const [processingBoost, setProcessingBoost] = useState<string | null>(null);

  const businessListingIds = useMemo(() => listings.map((l) => l.id), [listings]);
  const { businessBoosts, refetchBoosts } = useBusinessListingBoosts(businessListingIds);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        // Fetch business to get business_id
        const { data: business, error: businessError } = await supabase
          .from('business_listings')
          .select('id, subscription_tier')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();

        if (businessError && businessError.code !== 'PGRST116') {
          console.error('Error fetching business:', businessError);
          setIsLoading(false);
          setIsLoadingProducts(false);
          return;
        }

        if (business) {
          setCurrentBusinessId((business as any).id);
          
          // Check business_subscriptions table by user_id - only active subscriptions for consistency
          const { data: subscription, error: subError } = await supabase
            .from('business_subscriptions' as any)
            .select('subscription_tier, status')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .eq('subscription_tier', 'elite_marketplace')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          const isElite = !!(subscription && (subscription as any).subscription_tier === 'elite_marketplace');
          
          setHasEliteSubscription(isElite);
          
          // Only fetch marketplace products if user has elite subscription
          if (isElite) {
            const { data: productsData, error: productsError } = await supabase
              .from('marketplace_products' as any)
              .select('*')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false });

            if (productsError) {
              console.error('Error fetching products:', productsError);
            } else {
              setProducts((productsData as any) || []);
            }
          }
        }

        // Fetch business listings (include both approved and draft listings)
        // Explicitly select columns to avoid PostgREST schema cache issues with newly-added columns
        const { data: listingsData, error: listingsError } = await supabase
          .from('business_listings')
          .select('id, name, type, address, eircode, county, phone, website, description, logo_image, banner_image, coordinates, social, opening_hours, about_us, gallery_images, status, admin_approved, admin_notes, slug, partner, user_id, created_at, updated_at, views, rating, reviews, reviews_list, email, is_vet_partner, subscription_tier, refund_policy')
          .eq('user_id', user.id)
          .in('status', ['approved', 'draft', 'pending'])
          .order('created_at', { ascending: false });

        if (listingsError) {
          console.error('Error fetching business listings:', listingsError);
          toast({
            title: "Error",
            description: "Failed to load your business listings.",
            variant: "destructive"
          });
        } else {
          setListings((listingsData as unknown as BusinessListingData[]) || []);

          // Fetch boost config
          const { data: configData, error: configError } = await supabase
            .from('business_boost_config' as any)
            .select('boost_name, boost_amount, currency')
            .single();

          if (!configError && configData) {
            setBoostConfig(configData as unknown as { boost_name: string; boost_amount: number; currency: string });
          }
        }

      } catch (error) {
        console.error('Exception fetching data:', error);
        toast({
          title: "Error",
          description: "An unexpected error occurred while loading your data.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
        setIsLoadingProducts(false);
      }
    };

    fetchData();
  }, [user, toast]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('boost_success') === 'true') {
      void refetchBoosts();
      toast({
        title: 'Boost purchased',
        description: 'Your business boost is now active.',
      });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [refetchBoosts, toast]);

  const handleEdit = (listingId: string) => {
    setEditingId(editingId === listingId ? null : listingId);
  };

  const handleSave = async (listingId: string, formData: any) => {
    setIsSaving(true);
    try {
      const listing = listings.find(l => l.id === listingId);
      if (!listing) {
        throw new Error('Listing not found');
      }

      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Prepare social data
      const socialData = {
        facebook: formData.facebook || null,
        instagram: formData.instagram || null,
        tiktok: formData.tiktok || null
      };

      // Prepare update data including images
      const updateData: any = {
        name: formData.name,
        type: formData.type,
        address: formData.address,
        county: formData.county,
        phone: formData.phone,
        website: formData.website || null,
        description: formData.description,
        social: socialData,
        ...(formData.logo_image !== undefined && { logo_image: formData.logo_image }),
        ...(formData.banner_image !== undefined && { banner_image: formData.banner_image }),
        ...(formData.opening_hours !== undefined && { opening_hours: formData.opening_hours }),
        ...(formData.coordinates !== undefined && { coordinates: formData.coordinates }),
        ...(formData.eircode !== undefined && { eircode: formData.eircode }),
        ...(formData.about_us !== undefined && { about_us: formData.about_us || null }),
        ...(formData.gallery_images !== undefined && { gallery_images: formData.gallery_images || [] }),
      };

      // First, verify the listing exists and belongs to the user
      // Also check if it has active boosts - we need to preserve them
      const { data: existingListing, error: checkError } = await supabase
        .from('business_listings')
        .select('id, name')
        .eq('id', listingId)
        .eq('user_id', user.id)
        .single();

      // Check for active boosts - if they exist, we should not remove them
      const { data: activeBoosts } = await supabase
        .from('business_boosts' as any)
        .select('id, is_active, payment_status')
        .eq('business_id', listingId)
        .eq('is_active', true)
        .eq('payment_status', 'paid');
      
      const hasActiveBoosts = activeBoosts && activeBoosts.length > 0;

      if (checkError || !existingListing) {
        throw new Error('Listing not found or you do not have permission to edit it');
      }

      // IMPORTANT: Boosts are stored in a separate table (business_boosts) and are NOT affected
      // by editing the business listing. Active boosts will remain active and will show again
      // once the listing is re-approved by admin.
      if (hasActiveBoosts) {
      }

      // Update the EXISTING listing - do NOT create a new one
      // Using .update() ensures we're updating, not inserting
      // Note: We do NOT update boost-related fields - boosts are managed separately
      const { data: updatedData, error: updateError } = await supabase
        .from('business_listings')
        .update({
          ...updateData,
          status: 'draft',
          admin_approved: false,
          updated_at: new Date().toISOString()
          // Note: We intentionally do NOT touch any boost-related fields
          // Boosts are managed in the business_boosts table and remain active
        })
        .eq('id', listingId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating listing:', updateError);
        throw updateError;
      }

      if (!updatedData) {
        throw new Error('Update returned no data - listing may not exist or you may not have permission');
      }

      // Verify the updated listing has the same ID (not a new listing)
      if (updatedData.id !== listingId) {
        console.error('ERROR: Updated listing has different ID! This should not happen.');
        throw new Error('Update created a new listing instead of updating the existing one');
      }

      // Refresh from server to get the updated listing
      const { data: refreshedListings, error: fetchError } = await supabase
        .from('business_listings')
        .select('id, name, type, address, eircode, county, phone, website, description, logo_image, banner_image, coordinates, social, opening_hours, about_us, gallery_images, status, admin_approved, admin_notes, slug, partner, user_id, created_at, updated_at, views, rating, reviews, reviews_list, email, is_vet_partner, subscription_tier, refund_policy')
        .eq('user_id', user.id)
        .in('status', ['approved', 'draft', 'pending'])
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Error fetching updated listings:', fetchError);
        // Fallback: update local state manually
        setListings(prevListings => 
          prevListings.map(l => l.id === listingId ? { ...l, ...updatedData } as BusinessListingData : l)
        );
      } else if (refreshedListings) {
        // Ensure no duplicates - filter by unique ID
        const uniqueListings = refreshedListings.filter((listing, index, self) =>
          index === self.findIndex(l => l.id === listing.id)
        );

        setListings(uniqueListings as unknown as BusinessListingData[]);
      }

      setEditingId(null);
      toast({
        title: "Listing updated",
        description: "Your business listing has been saved as draft and will be reviewed by admin before going live.",
      });
    } catch (error: any) {
      console.error('Error saving listing:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusColor = (status: string, adminApproved: boolean) => {
    if (adminApproved && status === 'approved') return "bg-green-500";
    if (status === 'draft') return "bg-gray-500";
    if (status === 'pending') return "bg-amber-500";
    if (status === 'expired') return "bg-red-500";
    return "bg-gray-500";
  };

  const getStatusText = (status: string, adminApproved: boolean) => {
    if (adminApproved && status === 'approved') return "Live";
    if (status === 'draft') return "Draft (Pending Review)";
    if (status === 'pending') return "Pending";
    if (status === 'expired') return "Expired";
    return status;
  };

  const getDaysUntilExpiry = (createdAt: string) => {
    const created = new Date(createdAt);
    const expiry = new Date(created.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year from creation
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleBoostBusiness = async (listingId: string) => {
    if (!currentBusinessId || !user || !boostConfig) {
      toast({
        title: "Error",
        description: "Missing required information",
        variant: "destructive",
      });
      return;
    }

    setProcessingBoost(listingId);

    try {
      // Create Stripe checkout session for business boost
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          mode: 'payment',
          productType: 'business_listing_boost',
          businessListingId: listingId,
          planDetails: {
            id: 'business_listing_boost',
            name: boostConfig.boost_name,
            price: boostConfig.boost_amount / 100, // Convert cents to euros
            duration: 'one-time',
          },
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error: any) {
      console.error('Boost purchase failed:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to process boost purchase",
        variant: "destructive",
      });
      setProcessingBoost(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">My Business Listings</h2>
            <p className="text-muted-foreground">Manage your approved business listings</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  const getProductStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700"><Clock className="h-3 w-3 mr-1" />Draft</Badge>;
      case 'pending_approval':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700"><Clock className="h-3 w-3 mr-1" />Pending Approval</Badge>;
      case 'live':
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Live</Badge>;
      default:
        return null;
    }
  };

  const filteredProducts = products.filter(p => 
    productStatusFilter === 'all' || p.status === productStatusFilter
  );

  return (
    <div className="space-y-6 min-w-0 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 min-w-0">
        <div>
          <h2 className="text-2xl font-bold">My Listings</h2>
          <p className="text-muted-foreground">Manage your business listings and products</p>
        </div>
      </div>

      <Tabs defaultValue="listings" className="space-y-4 w-full min-w-0">
        <div className="overflow-x-auto">
          <TabsList className="w-max min-w-full sm:w-auto">
          <TabsTrigger value="listings">Business Listings</TabsTrigger>
          {hasEliteSubscription && (
            <TabsTrigger value="products">
              Products
              {products.length > 0 && (
                <Badge className="ml-2 bg-blue-500 text-white">
                  {products.length}
                </Badge>
              )}
            </TabsTrigger>
          )}
          </TabsList>
        </div>

        {/* Business Listings Tab */}
        <TabsContent value="listings" className="space-y-4">
          <div className="flex justify-start sm:justify-end">
            <Button
              onClick={() => router.push("/services/add")}
              className="bg-brand-soft-green hover:bg-brand-dark-green w-full sm:w-auto"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create New Listing
            </Button>
          </div>

          {listings.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <h3 className="text-lg font-medium mb-2">No business listings yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first business listing to get started.
            </p>
            <Button
              onClick={() => router.push("/services/add")}
              className="bg-brand-soft-green hover:bg-brand-dark-green"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Listing
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {listings.map((listing) => {
            const daysUntilExpiry = getDaysUntilExpiry(listing.created_at);
            const isExpiringSoon = daysUntilExpiry <= 30;
            const isEditing = editingId === listing.id;

            return (
              <div key={listing.id} className="space-y-4">
                {/* Expiry Warning */}
                {isExpiringSoon && daysUntilExpiry > 0 && (
                  <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-800">
                    <AlertCircleIcon className="h-5 w-5" />
                    <p className="font-medium">
                      Your listing "{listing.name}" will expire in {daysUntilExpiry} days!
                    </p>
                  </div>
                )}

                {/* Listing Card */}
                <Card className="overflow-hidden">
                  {/* Header with status badge */}
                  <div className="relative h-40 bg-gradient-to-r from-brand-dark-green to-brand-soft-green">
                    <div className="absolute left-4 sm:left-6 top-4 sm:top-6 flex gap-2 flex-wrap pr-4">
                      <Badge className={getStatusColor(listing.status, listing.admin_approved)}>
                        {getStatusText(listing.status, listing.admin_approved)}
                      </Badge>
                      
                      {listing.partner && (
                        <PartnerBadge />
                      )}

                      {/* Boost Badge - Only show for live listings */}
                      {listing.admin_approved && listing.status === 'approved' && businessBoosts[listing.id] && businessBoosts[listing.id].length > 0 && (
                        <Badge className="bg-yellow-500 text-white">
                          <Zap className="h-3 w-3 mr-1" />
                          Boosted ({businessBoosts[listing.id].length})
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <CardContent className="pt-6 min-w-0">
                    <div className="mb-4 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                        <div className="min-w-0">
                          <h3 className="text-2xl font-bold break-words break-all">{listing.name}</h3>
                          <p className="text-muted-foreground break-words break-all">{listing.type}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {listing.admin_approved && listing.status === 'approved' && (
                            businessBoosts[listing.id]?.length > 0 ? (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled
                                className="border-amber-300 bg-amber-50 text-amber-900 cursor-default"
                              >
                                <Zap className="mr-1 h-4 w-4" />
                                Boost active
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleBoostBusiness(listing.id)}
                                disabled={processingBoost === listing.id || !boostConfig}
                                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0 shadow-sm"
                              >
                                <TrendingUp className="mr-1 h-4 w-4" />
                                {processingBoost === listing.id ? 'Processing...' : 'Boost Business'}
                              </Button>
                            )
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(listing.id)}
                          >
                            <EditIcon className="mr-1 h-4 w-4" />
                            {isEditing ? "Cancel" : "Edit"}
                          </Button>
                        </div>
                      </div>
                      {/* Boost info card - full width below */}
                      {listing.admin_approved && listing.status === 'approved' && 
                       (!businessBoosts[listing.id] || businessBoosts[listing.id].length === 0) && (
                        <div 
                          className="bg-amber-50 border border-amber-200 rounded-md p-2.5 cursor-pointer hover:bg-amber-100 transition-colors"
                          onClick={() => router.push('/my-business-dashboard/boost')}
                        >
                          <div className="flex items-start gap-2">
                            <Info className="h-3.5 w-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
                            <div className="text-xs text-amber-900 space-y-1">
                              <p className="leading-tight font-medium">Featured placement in "Featured Businesses" carousel on homepage and service pages.</p>
                              <p className="leading-tight text-amber-700">Duration: Active until pushed out by newer boosts.</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {isEditing ? (
                      <div className="space-y-4 pt-4">
                        <div className="rounded-md border border-blue-200 bg-blue-50 p-4 mb-4">
                          <p className="text-sm text-blue-900">
                            <strong>Note:</strong> After saving, your listing will be set to draft status and will require admin approval before going live again.
                          </p>
                        </div>
                        <BusinessListingEditForm
                          listing={listing}
                          onSave={(data) => handleSave(listing.id, data)}
                          onCancel={() => setEditingId(null)}
                          isSaving={isSaving}
                        />
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div>
                          <h4 className="font-semibold">About</h4>
                          <p className="mt-1 break-words break-all whitespace-pre-wrap">{listing.description}</p>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                          <div>
                            <h4 className="font-semibold">Contact Information</h4>
                            <div className="mt-2 space-y-1">
                              <p className="break-words break-all">{listing.address}</p>
                              <p className="break-words break-all">{listing.county}</p>
                              <p>Phone: {listing.phone}</p>
                              {listing.website && (
                                <p className="break-all">Website: {listing.website}</p>
                              )}
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-semibold">Business Details</h4>
                            <div className="mt-2 space-y-1">
                              <p>Category: {listing.type}</p>
                              <p>Rating: {listing.rating ?? 0}/5</p>
                              <p>Reviews: {listing.reviews ?? 0}</p>
                              <p>Listed: {new Date(listing.created_at).toLocaleDateString('en-GB')}</p>
                              {/* Boost Information - Only show for live listings */}
                              {listing.admin_approved && listing.status === 'approved' && businessBoosts[listing.id] && businessBoosts[listing.id].length > 0 && (
                                <div className="mt-2 pt-2 border-t">
                                  <p className="font-semibold text-amber-600 flex items-center gap-1">
                                    <Zap className="h-4 w-4" />
                                    Active Boosts: {businessBoosts[listing.id].length}
                                  </p>
                                  {businessBoosts[listing.id].map((boost, idx) => (
                                    <p key={boost.id} className="text-sm text-muted-foreground">
                                      Boost {idx + 1}: Started {new Date(boost.boost_start_time).toLocaleDateString('en-GB')}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col space-y-2">
                          <div className="space-y-0.5">
                            <h4 className="font-semibold">Partner Badge Status</h4>
                            <p className="text-sm text-muted-foreground">
                              The partner badge is controlled by administrators.
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id={`partner-badge-${listing.id}`}
                              checked={listing.partner}
                              disabled
                            />
                            <Label htmlFor={`partner-badge-${listing.id}`}>Partner Badge</Label>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
          )}
        </TabsContent>

        {/* Products Tab - Only show if user has elite_marketplace subscription */}
        {hasEliteSubscription && (
          <TabsContent value="products" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <Select value={productStatusFilter} onValueChange={(value: any) => setProductStatusFilter(value)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending_approval">Pending Approval</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => router.push("/my-business-dashboard/marketplace/add")}
              className="bg-brand-soft-green hover:bg-brand-dark-green w-full sm:w-auto"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </div>

          {isLoadingProducts ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">
                  {productStatusFilter === 'all' ? 'No products yet' : `No ${productStatusFilter.replace('_', ' ')} products`}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {productStatusFilter === 'all' 
                    ? 'Create your first product to start selling on the marketplace.'
                    : `You don't have any ${productStatusFilter.replace('_', ' ')} products.`}
                </p>
                <Button
                  onClick={() => router.push("/my-business-dashboard/marketplace/add")}
                  className="bg-brand-soft-green hover:bg-brand-dark-green"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Product
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                <Table className="min-w-[760px] table-fixed">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Image</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => {
                      const mainImage = (product.images && Array.isArray(product.images) && product.images[0]) || product.image_url;
                      const displayPrice = product.sale_price ? product.sale_price : product.price;
                      const originalPrice = product.sale_price ? product.price : null;
                      
                      return (
                        <TableRow key={product.id}>
                          <TableCell>
                            {mainImage ? (
                              <img src={mainImage} alt={product.name} className="w-16 h-16 object-cover rounded" />
                            ) : (
                              <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
                                <Package className="h-6 w-6 text-gray-400" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            <span className="block whitespace-normal break-words max-w-[220px]" title={product.name}>{product.name}</span>
                          </TableCell>
                          <TableCell>
                            <span className="block whitespace-normal break-words max-w-[180px]" title={product.category || '-'}>{product.category || '-'}</span>
                          </TableCell>
                          <TableCell>{getProductStatusBadge(product.status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {originalPrice && (
                                <span className="text-sm text-muted-foreground line-through">
                                  €{originalPrice.toFixed(2)}
                                </span>
                              )}
                              <span className="font-semibold">€{displayPrice.toFixed(2)}</span>
                            </div>
                          </TableCell>
                          <TableCell>{product.stock_quantity || 0}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                </div>
              </CardContent>
            </Card>
          )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

