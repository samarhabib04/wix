import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { CheckCircle, XCircle, AlertTriangle, Calendar, MapPin, User, DollarSign, Heart, Star, Check, Images, Video, FileText } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { adminToast } from "@/lib/utils/adminToast";
import {
  resolveListingVerificationBadges,
} from "@/lib/utils/code-verification";
import { fetchPendingListingEdit } from "@/lib/utils/listing-edit-approval";
import { ListingPendingEditReview } from "@/components/admin-dashboard/ListingPendingEditReview";

interface ListingDetailsModalProps {
  listing: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onListingUpdated: () => void;
}

const ListingDetailsModal = ({ listing, open, onOpenChange, onListingUpdated }: ListingDetailsModalProps) => {
  const { toast } = useToast();
  const [adminNotes, setAdminNotes] = useState(listing?.admin_notes || "");
  const [isLoading, setIsLoading] = useState(false);
  const [fullListingData, setFullListingData] = useState<any>(null);
  const [pendingEdit, setPendingEdit] = useState<Record<string, unknown> | null>(null);
  // Inline confirmation state: null = no confirmation, 'approve' or 'reject'
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | null>(null);

  useEffect(() => {
    if (listing && open) {
      fetchFullListingData();
    }
    // Reset confirmation state when modal opens/closes
    if (!open) {
      setConfirmAction(null);
      setPendingEdit(null);
    }
  }, [listing, open]);

  const fetchFullListingData = async () => {
    if (!listing) return;

    try {
      // Normalize listing type - handle both 'type' and 'listing_type' properties
      const listingType = listing.type || listing.listing_type;
      
      const tableName = getTableName(listingType);
      if (!tableName) {
        console.error('Invalid listing type:', listingType);
        return;
      }

      const { data, error } = await supabase
        .from(tableName as any)
        .select('*')
        .eq('id', listing.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching full listing data:', error);
        return;
      }

      setFullListingData(data);

      const listingRow = data as { pending_edit_id?: string | null } | null;
      const normalizedType = (listing.type || listing.listing_type || '').toString().toLowerCase();
      if (listingRow?.pending_edit_id && (normalizedType === 'sale' || normalizedType === 'stud' || normalizedType === 'showcase')) {
        const edit = await fetchPendingListingEdit(
          normalizedType as 'sale' | 'stud' | 'showcase',
          listingRow.pending_edit_id,
        );
        setPendingEdit(edit?.status === 'pending' ? edit : null);
      } else {
        setPendingEdit(null);
      }
    } catch (error) {
      console.error('Error fetching listing data:', error);
    }
  };

  if (!listing) return null;

  const listingTypeLabel = listing.type || listing.listing_type;
  const normalizedListingType = listingTypeLabel?.toString().toLowerCase();
  const hasPendingEditReview = !!pendingEdit && normalizedListingType === 'sale';
  const isMarketplaceListing =
    listingTypeLabel === "Marketplace" || listingTypeLabel === "marketplace";

  const getTableName = (type: string | undefined | null): "stud_listings" | "showcase_listings" | "sale_listings" | "marketplace_products" | null => {
    // Normalize type to handle variations
    if (!type) {
      return null;
    }
    
    const normalizedType = type.toString().trim();
    
    switch (normalizedType) {
      case "Stud":
      case "stud":
        return "stud_listings";
      case "Showcase":
      case "showcase":
        return "showcase_listings";
      case "Marketplace":
      case "marketplace":
        return "marketplace_products";
      case "Sale":
      case "sale":
        return "sale_listings";
      default:
        return null;
    }
  };

  const handleApprove = async () => {
    if (!listing) return;

    try {
      setIsLoading(true);
      const listingType = listing.type || listing.listing_type;
      const tableName = getTableName(listingType);

      if (!tableName) {
        toast(adminToast.error('Invalid listing type'));
        return;
      }

      // Fetch existing listing to preserve current_boost_id
      let existingListing: { current_boost_id?: string | null } | null = null;
      if (tableName && tableName !== 'showcase_listings' && tableName !== 'marketplace_products') {
        const { data } = await supabase
          .from(tableName as any)
          .select('current_boost_id')
          .eq('id', listing.id)
          .single() as { data: { current_boost_id: string | null } | null };
        existingListing = data;
      }

      const updateData: any = {
          admin_approved: true,
          is_published: true,
        updated_at: new Date().toISOString()
      };

      // Preserve current_boost_id if it exists (for boosted listings)
      if (existingListing?.current_boost_id) {
        updateData.current_boost_id = existingListing.current_boost_id;
      }

      // Only set admin_notes and rejection_message for tables that have these columns (not marketplace_products)
      if (tableName !== 'marketplace_products') {
        updateData.admin_notes = adminNotes || null;
        updateData.rejection_message = null; // Clear rejection message when approving
      }

      // Set verification badges from validated health codes (sale + stud only)
      if (
        fullListingData &&
        listingType !== 'Showcase' &&
        listingType !== 'Marketplace' &&
        (listingType === 'Sale' ||
          listingType === 'sale' ||
          listingType === 'Stud' ||
          listingType === 'stud')
      ) {
        const verificationKind =
          listingType === 'Stud' || listingType === 'stud' ? 'stud' : 'sale';
        const badges = await resolveListingVerificationBadges(verificationKind, fullListingData);
        updateData.green_tick = badges.green_tick;
        updateData.gold_star = badges.gold_star;
        updateData.codes_verified = badges.codes_verified;
        updateData.verification_date = badges.verification_date;
      }

      // Sale: canonical live status is `active`. Showcase keeps `approved` (separate workflow).
      if (tableName === 'sale_listings') {
        updateData.status = 'active';
      } else if (tableName === 'showcase_listings') {
        updateData.status = 'approved';
      } else if (tableName === 'marketplace_products') {
        updateData.status = 'live';
        updateData.is_active = true; // Ensure product is active when approved
      }

      const { error } = await supabase
        .from(tableName as any)
        .update(updateData)
        .eq('id', listing.id);

      if (error) throw error;

      toast(adminToast.success('Listing approved successfully!'));
      setConfirmAction(null);
      onOpenChange(false);
      onListingUpdated();
    } catch (error: any) {
      console.error('Error approving listing:', error);
      toast(adminToast.error(`Failed to approve listing: ${error.message}`));
      setConfirmAction(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    if (!listing) return;

    const listingType = listing.type || listing.listing_type;
    const tableName = getTableName(listingType);
    const feedback = (adminNotes || "").trim();

    if (!tableName) {
      toast(adminToast.error('Invalid listing type'));
      return;
    }

    if (tableName !== "marketplace_products" && !feedback) {
      toast(adminToast.error('Please provide feedback for the rejection'));
      return;
    }

    try {
      setIsLoading(true);

      const updateData: any = {
          admin_approved: false,
          is_published: false,
          updated_at: new Date().toISOString()
      };

      // Only set admin_notes and rejection_message for tables that have these columns (not marketplace_products)
      if (tableName !== 'marketplace_products') {
        updateData.admin_notes = feedback;
        updateData.rejection_message = feedback;
      }

      // Update status field for sale_listings, showcase_listings, and marketplace_products
      if (tableName === 'sale_listings' || tableName === 'showcase_listings') {
        updateData.status = 'rejected';
      } else if (tableName === 'marketplace_products') {
        updateData.status = 'draft';
        updateData.is_active = false;
      }

      const { error } = await supabase
        .from(tableName as any)
        .update(updateData)
        .eq('id', listing.id);

      if (error) throw error;

      toast(adminToast.success('Listing rejected'));
      setConfirmAction(null);
      onOpenChange(false);
      onListingUpdated();
    } catch (error: any) {
      console.error('Error rejecting listing:', error);
      toast(adminToast.error(`Failed to reject listing: ${error.message}`));
      setConfirmAction(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePublished = async () => {
    if (!listing) return;

    try {
      setIsLoading(true);
      const listingType = listing.type || listing.listing_type;
      const tableName = getTableName(listingType);
      
      if (!tableName) {
        toast(adminToast.error('Invalid listing type'));
        return;
      }

      const newPublishedState = !listing.is_published;

      const { error } = await supabase
        .from(tableName as any)
        .update({
          is_published: newPublishedState,
          updated_at: new Date().toISOString()
        })
        .eq('id', listing.id);

      if (error) throw error;

      toast(adminToast.success(`Listing ${newPublishedState ? 'published' : 'unpublished'}`));
      onListingUpdated();
    } catch (error: any) {
      console.error('Error toggling published state:', error);
      toast(adminToast.error(`Failed to update listing visibility: ${error.message}`));
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string, verified: boolean) => {
    if (verified) {
      return <Badge className="bg-green-500">Active</Badge>;
    } else {
      return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  };

  const renderImages = () => {
    if (!fullListingData?.images || fullListingData.images.length === 0) return null;

    const images = Array.isArray(fullListingData.images) ? fullListingData.images : [];

    return (
      <div className="space-y-4">
        <h4 className="font-medium flex items-center gap-2">
          <Images className="h-4 w-4" />
          Images ({images.length})
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image: string, index: number) => (
            <div key={index} className="relative border rounded-md overflow-hidden bg-muted">
              <img 
                src={image} 
                alt={`Listing image ${index + 1}`}
                className="w-full h-48 object-contain rounded-md"
              />
              {index === (fullListingData.primary_image_index || 0) && (
                <div className="absolute top-1 right-1">
                  <Badge variant="secondary" className="text-xs">Primary</Badge>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderFamilyTree = () => {
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val) {
        setConfirmAction(null);
      }
      onOpenChange(val);
    }}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{(listing.type || listing.listing_type || 'Unknown')} Listing Details</span>
            {/* Only show verification badges for Sale and Stud listings, not Showcase or Marketplace */}
            {(listing.type || listing.listing_type) !== 'Showcase' && (listing.type || listing.listing_type) !== 'Marketplace' && (
              <>
            {(fullListingData?.gold_star || listing.gold_star) && <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />}
            {(fullListingData?.green_tick || listing.green_tick) && <Check className="h-5 w-5 text-green-500" />}
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            Review and manage this {(listing.type || listing.listing_type || 'unknown').toLowerCase()} listing
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {hasPendingEditReview && fullListingData && pendingEdit && (
            <ListingPendingEditReview
              listingType="sale"
              listingId={listing.id}
              sellerId={String(fullListingData.seller_id)}
              current={fullListingData}
              pendingEdit={pendingEdit}
              adminNotes={adminNotes}
              onCompleted={() => {
                onOpenChange(false);
                onListingUpdated();
              }}
            />
          )}

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-2">{fullListingData?.title || fullListingData?.name || listing.title || listing.name}</h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <p className="flex items-center gap-2">
                    <span className="font-medium">ID:</span> 
                    <code className="bg-gray-100 px-2 py-1 rounded text-xs">{listing.id}</code>
                  </p>
                  <p className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="font-medium">Seller:</span> {listing.seller}
                  </p>
                  <p className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span className="font-medium">Posted:</span> {listing.posted}
                  </p>
                  <p className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span className="font-medium">Location:</span> {fullListingData?.location || 'Not specified'}
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="font-medium">Breed:</span> {fullListingData?.breed || 'Not specified'}
                  </p>
                  {fullListingData?.breed_type && (
                    <p className="flex items-center gap-2">
                      <span className="font-medium">Breed Type:</span> {fullListingData.breed_type}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="flex items-center gap-2">
                  <span className="font-medium">Status:</span> 
                  {getStatusBadge(listing.status, listing.verified)}
                </p>
                <p className="flex items-center gap-2">
                  <span className="font-medium">Admin Approved:</span>
                  {listing.verified ? (
                    <Badge variant="default" className="bg-green-500">Yes</Badge>
                  ) : (
                    <Badge variant="destructive">No</Badge>
                  )}
                </p>
                
                {/* Verification Codes - Admin Only */}
                {fullListingData?.vaccination_code && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm font-medium text-blue-900 flex items-center gap-2">
                      <Check className="h-4 w-4" />
                      Vaccination Code
                    </p>
                    <code className="text-sm font-mono bg-white px-2 py-1 rounded mt-1 block">
                      {fullListingData.vaccination_code}
                    </code>
                  </div>
                )}
                {fullListingData?.health_check_code && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm font-medium text-yellow-900 flex items-center gap-2">
                      <Star className="h-4 w-4" />
                      Health Check Code
                    </p>
                    <code className="text-sm font-mono bg-white px-2 py-1 rounded mt-1 block">
                      {fullListingData.health_check_code}
                    </code>
                  </div>
                )}
                
                {/* Microchip Information - Issue #21 - Show for Sale listings */}
                {((listing.type === "Sale" || listing.listing_type === "Sale") && fullListingData?.microchip_database) && (
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-md">
                    <p className="text-sm font-medium text-purple-900 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Microchip Database
                    </p>
                    <code className="text-sm font-mono bg-white px-2 py-1 rounded mt-1 block">
                      {fullListingData.microchip_database}
                    </code>
                  </div>
                )}
                {fullListingData?.identifiers && (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                    <p className="text-sm font-medium text-gray-900">
                      Identifiers
                    </p>
                    <code className="text-sm font-mono bg-white px-2 py-1 rounded mt-1 block">
                      {fullListingData.identifiers}
                    </code>
                  </div>
                )}
                
                {/* Stud Listing Verification Fields - v1_cert, v2_cert, h1_cert, microchip_number */}
                {(listing.type === "Stud" || listing.listing_type === "Stud") && (
                  <div className="space-y-3 mt-4">
                    <h4 className="font-medium text-sm text-gray-900">Stud Listing Verification</h4>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <p className="text-sm font-medium text-blue-900 mb-1">Microchip Number</p>
                        <code className="text-sm font-mono bg-white px-2 py-1 rounded block break-all">
                          {fullListingData?.microchip_number || <span className="text-muted-foreground italic">Not provided</span>}
                        </code>
                      </div>
                      <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                        <p className="text-sm font-medium text-green-900 mb-1">V1 Certificate</p>
                        <code className="text-sm font-mono bg-white px-2 py-1 rounded block break-all">
                          {fullListingData?.v1_cert || <span className="text-muted-foreground italic">Not provided</span>}
                        </code>
                      </div>
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <p className="text-sm font-medium text-yellow-900 mb-1">V2 Certificate</p>
                        <code className="text-sm font-mono bg-white px-2 py-1 rounded block break-all">
                          {fullListingData?.v2_cert || <span className="text-muted-foreground italic">Not provided</span>}
                        </code>
                      </div>
                      <div className="p-3 bg-purple-50 border border-purple-200 rounded-md">
                        <p className="text-sm font-medium text-purple-900 mb-1">H1 Certificate</p>
                        <code className="text-sm font-mono bg-white px-2 py-1 rounded block break-all">
                          {fullListingData?.h1_cert || <span className="text-muted-foreground italic">Not provided</span>}
                        </code>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* 
                  Puppy Details - Show all fields from puppy_details array
                  - Sale Listings: Have puppy_details array with all puppy information
                  Each puppy object can have: id, sex, color, price, h1Code, v1Code, v2Code, imageUrl, colourCollar, microchipNumber
                */}
                {fullListingData?.puppy_details && (
                  (() => {
                    // Handle puppy_details as array or JSON string
                    let puppyDetailsArray: any[] = [];
                    if (Array.isArray(fullListingData.puppy_details)) {
                      puppyDetailsArray = fullListingData.puppy_details;
                    } else if (typeof fullListingData.puppy_details === 'string') {
                      try {
                        puppyDetailsArray = JSON.parse(fullListingData.puppy_details);
                      } catch (e) {
                        console.error('Failed to parse puppy_details JSON:', e);
                        puppyDetailsArray = [];
                      }
                    }
                    
                    if (puppyDetailsArray.length === 0) return null;
                    
                    return (
                      <div className="space-y-4 mt-4">
                        <h4 className="font-medium text-base">Puppy Details ({puppyDetailsArray.length} {puppyDetailsArray.length === 1 ? 'puppy' : 'puppies'})</h4>
                        {puppyDetailsArray.map((puppy: any, index: number) => {
                          // Extract all fields with fallback for different field name variations
                          const puppyId = puppy.id || `puppy-${index}`;
                          const sex = puppy.sex || '';
                          const color = puppy.color || '';
                          const price = puppy.price || '';
                          const h1Code = puppy.h1Code || puppy.h1_code || puppy.h1 || '';
                          const v1Code = puppy.v1Code || puppy.v1_code || puppy.v1 || '';
                          const v2Code = puppy.v2Code || puppy.v2_code || puppy.v2 || '';
                          const imageUrl = puppy.imageUrl || puppy.image_url || puppy.image || '';
                          const colourCollar = puppy.colourCollar || puppy.colour_collar || puppy.collar || '';
                          const microchipNumber = puppy.microchipNumber || puppy.microchip_number || puppy.microchip || '';
                          
                          return (
                            <div key={puppyId} className="border rounded-lg p-4 space-y-4 bg-muted/30">
                              <div className="flex items-center justify-between">
                                <h5 className="font-semibold text-base text-primary">
                                  Puppy {index + 1}
                                </h5>
                              </div>
                              
                              {/* Image */}
                              <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">Image</label>
                                {imageUrl ? (
                                  <div className="relative">
                                    <img 
                                      src={imageUrl} 
                                      alt={`Puppy ${index + 1}`}
                                      className="w-full max-w-xs h-48 object-cover rounded-md border"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                      }}
                                    />
                                  </div>
                                ) : (
                                  <div className="w-full max-w-xs h-48 bg-gray-100 rounded-md border flex items-center justify-center">
                                    <span className="text-sm text-muted-foreground italic">Not given</span>
                                  </div>
                                )}
                              </div>
                              
                              {/* Basic Information Grid */}
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div>
                                  <label className="text-xs font-medium text-muted-foreground">Sex</label>
                                  <p className="text-sm mt-1 bg-background p-2 rounded border capitalize">
                                    {sex || <span className="text-muted-foreground italic">Not given</span>}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-muted-foreground">Color</label>
                                  <p className="text-sm mt-1 bg-background p-2 rounded border">
                                    {color || <span className="text-muted-foreground italic">Not given</span>}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-muted-foreground">Price</label>
                                  <p className="text-sm mt-1 bg-background p-2 rounded border font-semibold">
                                    {price ? (typeof price === 'string' ? price : formatPrice(Number(price))) : <span className="text-muted-foreground italic">Not given</span>}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-muted-foreground">Collar Color</label>
                                  <p className="text-sm mt-1 bg-background p-2 rounded border">
                                    {colourCollar || <span className="text-muted-foreground italic">Not given</span>}
                                  </p>
                                </div>
                              </div>
                              
                              {/* Verification Codes Section */}
                              <div className="space-y-2 pt-2 border-t">
                                <h6 className="text-sm font-medium text-muted-foreground">Verification Codes</h6>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                  <div>
                                    <label className="text-xs font-medium text-muted-foreground">Microchip Number</label>
                                    <p className="text-sm font-mono mt-1 bg-background p-2 rounded border break-all">
                                      {microchipNumber || <span className="text-muted-foreground italic">Not given</span>}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-muted-foreground">V1 Code</label>
                                    <p className="text-sm font-mono mt-1 bg-background p-2 rounded border break-all">
                                      {v1Code || <span className="text-muted-foreground italic">Not given</span>}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-muted-foreground">V2 Code</label>
                                    <p className="text-sm font-mono mt-1 bg-background p-2 rounded border break-all">
                                      {v2Code || <span className="text-muted-foreground italic">Not given</span>}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-muted-foreground">H1 Code</label>
                                    <p className="text-sm font-mono mt-1 bg-background p-2 rounded border break-all">
                                      {h1Code || <span className="text-muted-foreground italic">Not given</span>}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Puppy Documents Section */}
                              {puppy.documents && Array.isArray(puppy.documents) && puppy.documents.length > 0 && (
                                <div className="space-y-2 pt-2 border-t">
                                  <h6 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    Supporting Documents ({puppy.documents.length})
                                  </h6>
                                  <div className="space-y-2">
                                    {puppy.documents.map((doc: any, docIndex: number) => (
                                      <div key={doc.id || docIndex} className="p-2 bg-gray-50 rounded border">
                                        <p className="text-sm font-medium">{doc.name || `Document ${docIndex + 1}`}</p>
                                        {doc.url && (
                                          <a 
                                            href={doc.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:underline text-xs mt-1 inline-block"
                                          >
                                            View Document
                                          </a>
                                        )}
                                        {doc.size && (
                                          <p className="text-xs text-gray-500 mt-1">
                                            Size: {(doc.size / 1024).toFixed(2)} KB
                                          </p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()
                )}
              </div>

              <div className="flex items-center space-x-2">
                <span className="font-medium">Published:</span>
                <Switch
                  checked={listing.verified && listing.status === "active"}
                  onCheckedChange={handleTogglePublished}
                  disabled={!listing.verified || isLoading}
                />
                <span className="text-sm text-gray-500">
                  {listing.verified && listing.status === "active" ? "Visible to public" : "Hidden from public"}
                </span>
              </div>

              {listing.hasPendingEdit && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
                  <p className="text-sm text-orange-800 font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    This listing has pending edits that need review
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {/* Pricing Information */}
              <div className="space-y-2">
                <h4 className="font-medium">Pricing Information</h4>
                <div className="space-y-1 text-sm">
                  {(listing.type === "Sale" || listing.listing_type === "Sale") && (
                    <>
                      {fullListingData?.price && (
                        <p className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          <span className="font-medium">Price:</span> {formatPrice(fullListingData.price)}
                        </p>
                      )}
                      {fullListingData?.min_price && (
                        <p className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          <span className="font-medium">Min Price:</span> {formatPrice(fullListingData.min_price)}
                        </p>
                      )}
                      {fullListingData?.max_price && (
                        <p className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          <span className="font-medium">Max Price:</span> {formatPrice(fullListingData.max_price)}
                        </p>
                      )}
                      {fullListingData?.same_pricing && (
                        <p><span className="font-medium">Same Pricing:</span> {fullListingData.same_pricing}</p>
                      )}
                    </>
                  )}
                  {(listing.type === "Stud" || listing.listing_type === "Stud") && (
                    <>
                      {fullListingData?.stud_fee && (
                        <p className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          <span className="font-medium">Stud Fee:</span> {formatPrice(fullListingData.stud_fee)}
                        </p>
                      )}
                      {fullListingData?.pick_of_litter !== undefined && (
                        <p><span className="font-medium">Pick of Litter:</span> {fullListingData.pick_of_litter ? 'Yes' : 'No'}</p>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Count Information */}
              {(fullListingData?.male_count !== undefined || fullListingData?.female_count !== undefined) && (
                <div className="space-y-2">
                  <h4 className="font-medium">Count Information</h4>
                  <div className="space-y-1 text-sm">
                    {fullListingData?.male_count !== undefined && (
                      <p><span className="font-medium">Male Count:</span> {fullListingData.male_count}</p>
                    )}
                    {fullListingData?.female_count !== undefined && (
                      <p><span className="font-medium">Female Count:</span> {fullListingData.female_count}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Date Information */}
              {fullListingData?.date_of_birth && (
                <div className="space-y-2">
                  <h4 className="font-medium">Date Information</h4>
                  <p className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4" />
                    <span className="font-medium">Date of Birth:</span> {formatDate(fullListingData.date_of_birth)}
                  </p>
                </div>
              )}

              {/* Special Badges - Only show for Sale and Stud listings, not Showcase */}
              {(listing.type || listing.listing_type) !== 'Showcase' && (
              <div className="space-y-2">
                <h4 className="font-medium">Special Badges</h4>
                <div className="flex flex-wrap gap-2">
                  {(fullListingData?.gold_star || listing.gold_star) && (
                    <Badge className="bg-yellow-500 flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      Gold Star
                    </Badge>
                  )}
                  {(fullListingData?.green_tick || listing.green_tick) && (
                    <Badge className="bg-green-500 flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      Green Tick
                    </Badge>
                  )}
                  {!fullListingData?.gold_star && !fullListingData?.green_tick && !listing.gold_star && !listing.green_tick && (
                    <span className="text-sm text-gray-500">No special badges</span>
                  )}
                </div>
              </div>
              )}

              {/* Health Information */}
              {(fullListingData?.vet_name || fullListingData?.vet_location) && (
                <div className="space-y-2">
                  <h4 className="font-medium">Health Information</h4>
                  <div className="space-y-1 text-sm">
                    {fullListingData?.vet_name && (
                      <p><span className="font-medium">Vet Name:</span> {fullListingData.vet_name}</p>
                    )}
                    {fullListingData?.vet_location && (
                      <p><span className="font-medium">Vet Location:</span> {fullListingData.vet_location}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {fullListingData?.description && (
            <div className="space-y-2">
              <h4 className="font-medium">Description</h4>
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="text-sm whitespace-pre-wrap">{fullListingData.description}</p>
              </div>
            </div>
          )}

          {/* Images Section */}
          {renderImages()}

          {/* Media Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {fullListingData?.video_url && (
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Video className="h-4 w-4" />
                  Video
                </h4>
                <p className="text-sm text-gray-600">Video URL provided</p>
                <a 
                  href={fullListingData.video_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm"
                >
                  View Video
                </a>
              </div>
            )}
            
            {/* Document Information */}
            {(() => {
              const isSaleListing = listing.type === "Sale" || listing.listing_type === "Sale";
              const isStudListing = listing.type === "Stud" || listing.listing_type === "Stud";
              
              // For Sale listings, show documents field
              if (isSaleListing && fullListingData?.documents) {
                let documentsArray: any[] = [];
                if (Array.isArray(fullListingData.documents)) {
                  documentsArray = fullListingData.documents;
                } else if (typeof fullListingData.documents === 'string') {
                  try {
                    documentsArray = JSON.parse(fullListingData.documents);
                  } catch (e) {
                    console.error('Failed to parse documents JSON:', e);
                    documentsArray = [];
                  }
                }
                
                if (documentsArray.length > 0) {
                  return (
                    <div className="space-y-2">
                      <h4 className="font-medium flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Documents ({documentsArray.length})
                      </h4>
                      <div className="space-y-2">
                        {documentsArray.map((doc: any, index: number) => (
                          <div key={doc.id || index} className="p-2 bg-gray-50 rounded border">
                            <p className="text-sm font-medium">{doc.name || `Document ${index + 1}`}</p>
                            {doc.url && (
                              <a 
                                href={doc.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline text-xs mt-1 inline-block"
                              >
                                View Document
                              </a>
                            )}
                            {doc.size && (
                              <p className="text-xs text-gray-500 mt-1">
                                Size: {(doc.size / 1024).toFixed(2)} KB
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
              }
              
              // For Stud listings, show certificate fields and supporting documents
              if (isStudListing && (fullListingData?.v1_cert || fullListingData?.v2_cert || fullListingData?.h1_cert || fullListingData?.documents)) {
                let documentsArray: any[] = [];
                if (fullListingData?.documents) {
                  if (Array.isArray(fullListingData.documents)) {
                    documentsArray = fullListingData.documents;
                  } else if (typeof fullListingData.documents === 'string') {
                    try {
                      documentsArray = JSON.parse(fullListingData.documents);
                    } catch (e) {
                      console.error('Failed to parse documents JSON:', e);
                      documentsArray = [];
                    }
                  }
                }

                return (
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Documents
                    </h4>
                    <div className="space-y-3">
                      {/* Health Certificates */}
                      {(fullListingData?.v1_cert || fullListingData?.v2_cert || fullListingData?.h1_cert) && (
                        <div className="space-y-1 text-sm">
                          <p className="font-medium text-gray-700">Health Certificates:</p>
                          {fullListingData?.v1_cert && <p className="pl-2">V1 Certificate provided</p>}
                          {fullListingData?.v2_cert && <p className="pl-2">V2 Certificate provided</p>}
                          {fullListingData?.h1_cert && <p className="pl-2">H1 Certificate provided</p>}
                        </div>
                      )}
                      {/* Supporting Documents */}
                      {documentsArray.length > 0 && (
                        <div className="space-y-2">
                          <p className="font-medium text-gray-700">Supporting Documents ({documentsArray.length}):</p>
                          {documentsArray.map((doc: any, index: number) => (
                            <div key={doc.id || index} className="p-2 bg-gray-50 rounded border pl-4">
                              <p className="text-sm font-medium">{doc.name || `Document ${index + 1}`}</p>
                              {doc.url && (
                                <a 
                                  href={doc.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline text-xs mt-1 inline-block"
                                >
                                  View Document
                                </a>
                              )}
                              {doc.size && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Size: {(doc.size / 1024).toFixed(2)} KB
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              }
              
              return null;
            })()}
            
          </div>

          {/* Admin Notes Section */}
          <div className="space-y-4">
            <h4 className="font-medium">Admin Notes</h4>
            <Textarea
              placeholder={
                isMarketplaceListing
                  ? "Optional feedback for the seller (marketplace reject works without notes)"
                  : "Add notes for the seller (required for rejection)"
              }
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={4}
            />
          </div>

          {/* Inline Confirmation Banner */}
          {!hasPendingEditReview && confirmAction && (
            <div className={`p-4 rounded-lg border-2 ${confirmAction === 'approve'
              ? 'bg-green-50 border-green-300'
              : 'bg-red-50 border-red-300'
              }`}>
              <p className={`font-semibold mb-1 ${confirmAction === 'approve' ? 'text-green-800' : 'text-red-800'
                }`}>
                {confirmAction === 'approve'
                  ? 'Are you sure you want to approve this listing?'
                  : 'Are you sure you want to reject this listing?'}
              </p>
              <p className={`text-sm mb-3 ${confirmAction === 'approve' ? 'text-green-700' : 'text-red-700'
                }`}>
                {confirmAction === 'approve'
                  ? 'This will approve the listing, make it visible to all users, and send a notification to the seller.'
                  : 'This will reject the listing and notify the seller.'}
              </p>
              {confirmAction === 'reject' && !isMarketplaceListing && !adminNotes?.trim() && (
                <div className="flex items-center mb-3 text-red-600 text-sm">
                  <AlertTriangle className="h-4 w-4 mr-1 flex-shrink-0" />
                  Please add admin notes with feedback before rejecting.
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmAction(null)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className={confirmAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                  onClick={async () => {
                    if (confirmAction === 'approve') {
                      await handleApprove();
                    } else {
                      await handleReject();
                    }
                  }}
                  disabled={
                    isLoading ||
                    (confirmAction === "reject" && !isMarketplaceListing && !adminNotes?.trim())
                  }
                >
                  {isLoading
                    ? 'Processing...'
                    : confirmAction === 'approve'
                      ? 'Yes, Approve'
                      : 'Yes, Reject'}
                </Button>
              </div>
            </div>
          )}

          {/* Action Buttons — initial approval only (not when reviewing a pending edit) */}
          {!hasPendingEditReview && (
          <div className="flex justify-between pt-6 border-t">
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              disabled={isLoading}
            >
              Close
            </Button>
            
            <div className="space-x-2">
              <Button
                variant="destructive"
                disabled={isLoading || confirmAction !== null}
                onClick={() => setConfirmAction('reject')}
              >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
              <Button
                variant="default"
                className="bg-green-600 hover:bg-green-700"
                disabled={isLoading || confirmAction !== null}
                onClick={() => setConfirmAction('approve')}
              >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
            </div>
          </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ListingDetailsModal;
