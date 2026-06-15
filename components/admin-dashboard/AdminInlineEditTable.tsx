import React, { useRef, useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MoreHorizontal, Eye, Edit, Trash2, ChevronDown, ChevronRight, Copy, Check, X, Ban } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { InlineEditableText } from './InlineEditableText';
import { InlineEditableSelect } from './InlineEditableSelect';
import { InlineEditableToggle } from './InlineEditableToggle';
import TruncatedCellText from './TruncatedCellText';
import { adminListingKind } from '@/lib/utils/admin-listing-kind';

interface AdminInlineEditTableProps {
  listings: any[];
  onFieldUpdate: (listing: any, field: string, value: string | number | boolean) => Promise<void>;
  onViewDetails: (listingId: string, listingType: string) => void;
  onEdit: (listingId: string, listingType: string) => void;
  onDelete?: (listingId: string, listingType: string) => void;
  /** When set (e.g. marketplace tab), show Reject for listings awaiting approval */
  onReject?: (listingId: string, listingType: string) => void;
}

export const AdminInlineEditTable: React.FC<AdminInlineEditTableProps> = ({
  listings,
  onFieldUpdate,
  onViewDetails,
  onEdit,
  onDelete,
  onReject
}) => {
  const { toast } = useToast();
  const tableRef = useRef<HTMLTableElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const tableWrapperRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef<boolean>(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const isNonVerificationListing = (listing: any) => {
    const k = adminListingKind(listing.listing_type || listing.type);
    return k === 'showcase' || k === 'marketplace';
  };

  const canShowMarketplaceReject = (listing: any) => {
    if (!onReject) return false;
    if (adminListingKind(listing.listing_type || listing.type) !== 'marketplace') return false;
    const s = (listing.status || '').toString().toLowerCase();
    if (s === 'live') return false;
    return s === 'pending_approval' || listing.admin_approved !== true;
  };

  const toggleRow = (listingId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(listingId)) {
        newSet.delete(listingId);
      } else {
        newSet.add(listingId);
      }
      return newSet;
    });
  };

  // Status options for all listing types
  const getStatusOptions = (listingType: string) => {
    const baseOptions = [
      { value: 'pending_review', label: 'Pending Review' },
      { value: 'active', label: 'Active' },
      { value: 'rejected', label: 'Rejected' },
      { value: 'pending_re_approval', label: 'Pending Re-approval' },
      { value: 'edit_pending_review', label: 'Edit Pending Review' },
      { value: 'inactive', label: 'Inactive' },
      { value: 'expired', label: 'Expired' },
      { value: 'pending', label: 'Pending' },
      { value: 'draft', label: 'Draft' }
    ];

    // Normalize listing type (handle case variations and whitespace)
    const normalizedType = listingType?.toString().toLowerCase().trim();

    // For marketplace products, map to marketplace statuses
    if (normalizedType === 'marketplace') {
      return [
        { value: 'pending_review', label: 'Pending Approval' },
        { value: 'active', label: 'Live' },
        { value: 'inactive', label: 'Draft' },
        { value: 'rejected', label: 'Rejected' }
      ];
    }

    // For sale_listings: one live status — `active` (legacy DB `approved` maps to Active in the UI).
    if (normalizedType === 'sale') {
      return [
        { value: 'pending_review', label: 'Pending Review' },
        { value: 'active', label: 'Active' },
        { value: 'rejected', label: 'Rejected' },
        { value: 'pending_re_approval', label: 'Pending Re-approval' },
        { value: 'edit_pending_review', label: 'Edit Pending Review' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'expired', label: 'Expired' },
        { value: 'pending', label: 'Pending' },
        { value: 'draft', label: 'Draft' },
      ];
    }

    // For stud, only show relevant options (no expired)
    if (normalizedType === 'stud') {
      return baseOptions.filter(opt =>
        ['pending_review', 'active', 'rejected', 'pending_re_approval', 'edit_pending_review', 'inactive'].includes(opt.value)
      );
    }

    // For showcase, only show 3 options: Pending Review, Approved, Rejected
    if (normalizedType === 'showcase') {
      return baseOptions.filter(opt =>
        ['pending_review', 'active', 'rejected'].includes(opt.value)
      );
    }

    // For other types (or anything else that's not sale/stud/showcase), include expired option
    const showcaseOptions = baseOptions.filter(opt =>
      ['pending_review', 'active', 'rejected', 'pending_re_approval', 'edit_pending_review', 'inactive', 'expired'].includes(opt.value)
    );
    return showcaseOptions;
  };

  const getStatusBadge = (status: string) => {
    // Handle marketplace product statuses
    if (status === 'live' || status === 'pending_approval' || status === 'draft') {
      const variant =
        status === 'live' ? 'secondary' :
        status === 'pending_approval' ? 'default' :
        'outline';
      
      return (
        <Badge variant={variant}>
          {status === 'live' ? 'Live' : status === 'pending_approval' ? 'Pending Approval' : 'Draft'}
        </Badge>
      );
    }
    
    const variant =
      status === 'approved' || status === 'active' ? 'secondary' :
        status === 'pending' ? 'outline' :
          status === 'pending_re_approval' ? 'default' :
            status === 'edit_pending_review' ? 'default' :
            'destructive';

    const label =
      status === 'pending_re_approval'
        ? 'Pending Re-approval'
        : status === 'edit_pending_review'
          ? 'Edit Pending Review'
        : status === 'approved' || status === 'active'
          ? 'Active'
            : status;

    return (
      <Badge variant={variant}>
        {label}
      </Badge>
    );
  };

  // Helper function to determine status value
  const getStatusValue = (listing: any, statusOptions: any[]) => {
    let statusValue: string;
    const kind = adminListingKind(listing.listing_type || listing.type);
    const rawAdminApproved = listing.admin_approved;
    const rawIsPublished = listing.is_published;

    const adminApproved = rawAdminApproved === true ||
      rawAdminApproved === 'TRUE' ||
      rawAdminApproved === 'true' ||
      rawAdminApproved === 1 ||
      rawAdminApproved === '1' ||
      (typeof rawAdminApproved === 'string' && rawAdminApproved.toUpperCase() === 'TRUE');
    const isPublished = rawIsPublished === true ||
      rawIsPublished === 'TRUE' ||
      rawIsPublished === 'true' ||
      rawIsPublished === 1 ||
      rawIsPublished === '1' ||
      (typeof rawIsPublished === 'string' && rawIsPublished.toUpperCase() === 'TRUE');

    if (kind === 'marketplace') {
      if (listing.status === 'live') {
        statusValue = 'active';
      } else if (listing.status === 'pending_approval') {
        statusValue = 'pending_review';
      } else if (listing.status === 'draft') {
        statusValue = 'inactive';
      } else {
        statusValue = listing.status || 'inactive';
      }
      const isValidMarketplace = statusOptions.find(opt => opt.value === statusValue);
      if (!isValidMarketplace) {
        statusValue = 'pending_review';
      }
      return statusValue;
    }

    if (listing.status === 'rejected' || listing.rejection_message) {
      statusValue = 'rejected';
    } else if (listing.pending_edit_id) {
      statusValue = 'edit_pending_review';
    } else if (kind === 'sale') {
      // Prioritize actual database status - only derive from admin_approved/is_published if status is NULL/undefined
      if (listing.status != null && listing.status !== '') {
        const dbStatus = listing.status.toLowerCase();
        // Canonical live status is `active`; legacy `approved` rows show as Active.
        if (dbStatus === 'active' || dbStatus === 'approved') {
          statusValue = 'active';
        } else if (['pending', 'pending_review', 'pending_approval', 'draft', 'pending_re_approval'].includes(dbStatus)) {
          statusValue = 'pending_review';
        } else if (dbStatus === 'rejected') {
          statusValue = 'rejected';
        } else {
          statusValue = dbStatus; // Use database status as-is
        }
      } else {
        // Fallback: derive from admin_approved/is_published only if status is NULL
        if (adminApproved && isPublished) {
          statusValue = 'active';
        } else if (adminApproved && !isPublished) {
          statusValue = 'inactive';
        } else if (!adminApproved) {
          statusValue = 'pending_review';
        } else {
          statusValue = 'pending_review';
        }
      }
    } else if (kind === 'showcase') {
      // For showcase listings, check if status field exists first, otherwise derive from admin_approved and is_published
      if (listing.status) {
        // Use the status field if it exists
        statusValue = listing.status.toLowerCase();
      } else if (adminApproved && isPublished) {
        statusValue = 'approved';
      } else if (adminApproved && !isPublished) {
        statusValue = 'approved'; // Approved but not published (expired showcase)
      } else if (!adminApproved) {
        statusValue = 'pending_review';
      } else {
        statusValue = 'pending_review';
      }
    } else if (adminApproved && isPublished) {
      statusValue = 'active';
    } else if (adminApproved && !isPublished) {
      statusValue = 'inactive';
    } else if (!adminApproved) {
      statusValue = 'pending_review';
    } else {
      statusValue = 'pending_review';
    }

    const isValidStatus = statusOptions.find(opt => opt.value === statusValue);
    if (!isValidStatus) {
      statusValue = 'pending_review';
    }

    return statusValue;
  };

  // Mobile Card View Component
  const MobileCardView = ({ listing }: { listing: any }) => {
    const listingTypeValue = listing.listing_type || listing.type || listing.listingType || 'unknown';
    const statusOptions = getStatusOptions(listingTypeValue);
    const statusValue = getStatusValue(listing, statusOptions);

    return (
      <Card className="mb-4 border shadow-sm">
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Header with ID and Actions */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 flex-shrink-0"
                  onClick={() => toggleRow(listing.id)}
                >
                  {expandedRows.has(listing.id) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1 group cursor-pointer min-w-0">
                        <span className="text-xs font-mono truncate">{listing.id.substring(0, 12)}...</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(listing.id);
                            toast({
                              title: "Copied!",
                              description: "Listing ID copied to clipboard",
                            });
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <p className="text-xs font-mono break-all">{listing.id}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => onViewDetails(listing.id, listing.listing_type)}
                  title="View Details"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => onEdit(listing.id, listing.listing_type)}
                  title="Edit"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                {canShowMarketplaceReject(listing) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => onReject?.(listing.id, listing.listing_type)}
                    title="Reject listing"
                  >
                    <Ban className="h-4 w-4" />
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => onDelete(listing.id, listing.listing_type)}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Title</label>
              <div className="flex items-center gap-2">
                <InlineEditableText
                  value={listing.title}
                  onSave={(value) => onFieldUpdate(listing, 'title', value)}
                />
                {listing.current_boost_id && (
                  <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 text-xs">
                    ⚡ Boosted
                  </Badge>
                )}
              </div>
            </div>

            {/* Breed and Location Row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Breed</label>
                <p className="text-sm">{listing.breed || 'N/A'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Location</label>
                <p className="text-sm">{listing.location || 'N/A'}</p>
              </div>
            </div>

            {/* Price and Status Row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Price</label>
                <InlineEditableText
                  value={listing.price || 0}
                  onSave={(value) => onFieldUpdate(listing, 'price', value)}
                  type="number"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
                <InlineEditableSelect
                  value={statusValue}
                  options={statusOptions}
                  onSave={async (value) => {
                    await onFieldUpdate(listing, 'status', value);
                  }}
                />
              </div>
            </div>

            {/* Type and Posted Date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Type</label>
                <Badge variant="outline" className="text-xs">{listing.listing_type}</Badge>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Posted</label>
                <p className="text-sm">{new Date(listing.created_at).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Verification - Only show for Sale and Stud listings, not Showcase or Marketplace */}
            {!isNonVerificationListing(listing) && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Verification</label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Codes Verified:</span>
                    <Badge variant={listing.codes_verified ? "default" : "outline"} className={listing.codes_verified ? "bg-green-500 text-white" : ""}>
                      {listing.codes_verified ? (
                        <span className="flex items-center gap-1">
                          <Check className="h-3 w-3" /> Verified
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <X className="h-3 w-3" /> Unverified
                        </span>
                      )}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Green Tick:</span>
                    <InlineEditableToggle
                      toggleId={`${listing.id}-green-tick`}
                      value={listing.green_tick}
                      label={listing.green_tick ? '✓' : '✗'}
                      onSave={(value) => onFieldUpdate(listing, 'green_tick', value)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Gold Star:</span>
                    <InlineEditableToggle
                      toggleId={`${listing.id}-gold-star`}
                      value={listing.gold_star}
                      label={listing.gold_star ? '⭐' : '☆'}
                      onSave={(value) => onFieldUpdate(listing, 'gold_star', value)}
                    />
                  </div>
                  {listing.verification_date && (
                    <p className="text-xs text-muted-foreground">
                      Verified: {new Date(listing.verification_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Description (if available) */}
            {listing.description && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {listing.description}
                </p>
              </div>
            )}

            {/* Expandable Verification Details - Only for Sale and Stud listings, not Showcase or Marketplace */}
            {expandedRows.has(listing.id) && !isNonVerificationListing(listing) && (
              <div className="pt-4 border-t space-y-4">
                <h4 className="font-semibold text-sm mb-3">Verification Details</h4>
                {listing.puppy_details && Array.isArray(listing.puppy_details) && listing.puppy_details.length > 0 ? (
                  listing.puppy_details.map((puppy: any, index: number) => {
                    const microchip = puppy.microchipNumber || puppy.microchip_number || puppy.microchip || '';
                    const v1 = puppy.v1Code || puppy.v1_code || puppy.v1 || '';
                    const v2 = puppy.v2Code || puppy.v2_code || puppy.v2 || '';
                    const h1 = puppy.h1Code || puppy.h1_code || puppy.h1 || '';

                    return (
                      <div key={puppy.id || index} className="border rounded-lg p-3 space-y-2 bg-muted/30">
                        <h5 className="font-medium text-sm text-primary">
                          Puppy {index + 1} {puppy.sex ? `(${puppy.sex})` : ''}
                          {puppy.color ? ` - ${puppy.color}` : ''}
                          {puppy.colourCollar ? ` - ${puppy.colourCollar} collar` : ''}
                        </h5>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">Microchip</label>
                            <p className="text-xs font-mono">
                              {microchip || <span className="text-muted-foreground italic">Not provided</span>}
                            </p>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">V1 Code</label>
                            <p className="text-xs font-mono">
                              {v1 || <span className="text-muted-foreground italic">Not provided</span>}
                            </p>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">V2 Code</label>
                            <p className="text-xs font-mono">
                              {v2 || <span className="text-muted-foreground italic">Not provided</span>}
                            </p>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">H1 Code</label>
                            <p className="text-xs font-mono">
                              {h1 || <span className="text-muted-foreground italic">Not provided</span>}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground">No puppy details available</p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Card className="w-full overflow-hidden shadow-sm" style={{ maxWidth: '100%', boxSizing: 'border-box' }}>
      <CardContent className="p-0" style={{ overflow: 'hidden' }}>
        {/* Mobile Card View */}
        <div className="block md:hidden p-4">
          {listings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="flex flex-col items-center gap-2">
                <p className="text-base font-medium">No listings found</p>
                <p className="text-sm text-center">No listings match your current search or filter criteria.</p>
              </div>
            </div>
          ) : (
            listings.map((listing) => (
              <MobileCardView key={listing.id} listing={listing} />
            ))
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block" style={{ width: '100%', maxWidth: '100%' }}>
          {/* Top Horizontal Scrollbar - Always Visible */}
          <div
            ref={topScrollRef}
            className="overflow-x-auto overflow-y-hidden mb-2"
            style={{
              width: '100%',
              maxWidth: '100%',
              WebkitOverflowScrolling: 'touch',
              borderBottom: '1px solid #e5e7eb',
              paddingBottom: '2px'
            }}
            onScroll={(e) => {

              if (tableWrapperRef.current) {

                tableWrapperRef.current.scrollLeft = e.currentTarget.scrollLeft;

              } else {

              }
            }}
          >
            <div style={{ width: '1800px', height: '16px', backgroundColor: '#e0e7ff' }} />
          </div>

          {/* Main Table Container - Vertical Scroll Only */}
          <div
            id="bottomScroll"
            className="overflow-y-auto"
            style={{
              WebkitOverflowScrolling: 'touch',
              maxHeight: 'calc(100vh - 500px)',
              minHeight: '400px',
              width: '100%',
              maxWidth: '100%'
            }}
          >
            {/* Inner wrapper for horizontal scrolling - scrollbar hidden */}
            <div
              ref={tableWrapperRef}
              style={{
                overflowX: 'auto',
                overflowY: 'hidden',
                marginBottom: '-20px',
                paddingBottom: '20px',
                width: '100%'
              }}
              onScroll={(e) => {

                if (!isScrollingRef.current && topScrollRef.current) {

                  isScrollingRef.current = true;
                  topScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
                  requestAnimationFrame(() => {
                    isScrollingRef.current = false;
                  });
                }
              }}
            >
              <div style={{ display: 'inline-block', minWidth: '100%' }}>
                <Table ref={tableRef} style={{ minWidth: '1800px' }}>
                  <TableHeader className="sticky top-0 z-10 bg-muted/50 border-b">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="sticky left-0 z-20 bg-muted/50 border-r w-[80px] sm:w-[100px] font-semibold text-xs sm:text-sm whitespace-nowrap">ID</TableHead>
                      <TableHead className="min-w-[150px] sm:min-w-[200px] font-semibold text-xs sm:text-sm hidden md:table-cell">Title</TableHead>
                      <TableHead className="min-w-[150px] sm:min-w-[200px] font-semibold text-xs sm:text-sm hidden lg:table-cell">Description</TableHead>
                      <TableHead className="min-w-[100px] sm:min-w-[120px] font-semibold text-xs sm:text-sm">Breed</TableHead>
                      <TableHead className="min-w-[100px] sm:min-w-[120px] font-semibold text-xs sm:text-sm hidden sm:table-cell">Location</TableHead>
                      <TableHead className="min-w-[80px] sm:min-w-[100px] font-semibold text-xs sm:text-sm">Price</TableHead>
                      <TableHead className="min-w-[120px] sm:min-w-[150px] font-semibold text-xs sm:text-sm">Status</TableHead>
                      {/* Verification column - hidden for Showcase and Marketplace listings */}
                      {listings.some(l => !isNonVerificationListing(l)) && (
                        <TableHead className="min-w-[120px] sm:min-w-[150px] font-semibold text-xs sm:text-sm hidden lg:table-cell">
                          Verification
                        </TableHead>
                      )}
                      <TableHead className="min-w-[80px] sm:min-w-[100px] font-semibold text-xs sm:text-sm hidden md:table-cell">Type</TableHead>
                      <TableHead className="min-w-[80px] sm:min-w-[100px] font-semibold text-xs sm:text-sm hidden xl:table-cell">Posted</TableHead>
                      <TableHead className="sticky right-0 z-20 bg-muted/50 border-l text-right min-w-[100px] sm:min-w-[140px] font-semibold text-xs sm:text-sm whitespace-nowrap">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {listings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={listings.some(l => !isNonVerificationListing(l)) ? 11 : 10} className="text-center py-12 text-muted-foreground px-4">
                          <div className="flex flex-col items-center gap-2">
                            <p className="text-base font-medium">No listings found</p>
                            <p className="text-sm text-center">No listings match your current search or filter criteria.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      listings.map((listing) => (
                        <React.Fragment key={listing.id}>
                          <TableRow className="hover:bg-muted/50">
                            <TableCell className="sticky left-0 z-10 bg-background font-medium border-r whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => toggleRow(listing.id)}
                                >
                                  {expandedRows.has(listing.id) ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </Button>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex items-center gap-1 group cursor-pointer">
                                        <span className="text-xs font-mono">{listing.id.substring(0, 8)}...</span>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            navigator.clipboard.writeText(listing.id);
                                            toast({
                                              title: "Copied!",
                                              description: "Listing ID copied to clipboard",
                                            });
                                          }}
                                        >
                                          <Copy className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="max-w-xs">
                                      <p className="text-xs font-mono break-all">{listing.id}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </TableCell>

                            <TableCell className="hidden md:table-cell">
                              <div className="flex items-center gap-2">
                                <InlineEditableText
                                  value={listing.title}
                                  onSave={(value) => onFieldUpdate(listing, 'title', value)}
                                />
                                {listing.current_boost_id && (
                                  <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 text-xs">
                                    ⚡ Boosted
                                  </Badge>
                                )}
                              </div>
                            </TableCell>

                            <TableCell className="hidden lg:table-cell">
                              <InlineEditableText
                                value={listing.description?.substring(0, 50) + '...' || 'No description'}
                                onSave={(value) => onFieldUpdate(listing, 'description', value)}
                                multiline
                              />
                            </TableCell>

                            <TableCell className="text-xs sm:text-sm">
                              <TruncatedCellText text={listing.breed} maxChars={20} className="max-w-[150px]" />
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-xs sm:text-sm">
                              <TruncatedCellText text={listing.location} maxChars={20} className="max-w-[150px]" />
                            </TableCell>

                            <TableCell>
                              <InlineEditableText
                                value={listing.price || 0}
                                onSave={(value) => onFieldUpdate(listing, 'price', value)}
                                type="number"
                              />
                            </TableCell>

                            <TableCell>
                              {(() => {
                                const listingTypeValue = listing.listing_type || listing.type || listing.listingType || 'unknown';
                                const statusOptions = getStatusOptions(listingTypeValue);
                                const statusValue = getStatusValue(listing, statusOptions);

                                return (
                                  <InlineEditableSelect
                                    value={statusValue}
                                    options={statusOptions}
                                    onSave={async (value) => {
                                      await onFieldUpdate(listing, 'status', value);
                                    }}
                                  />
                                );
                              })()}
                            </TableCell>

                            {/* Verification column - Only show for Sale and Stud listings, not Showcase or Marketplace */}
                            {!isNonVerificationListing(listing) ? (
                              <TableCell className="hidden lg:table-cell">
                                <div className="flex flex-col gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-muted-foreground w-24">Codes:</span>
                                    <Badge variant={listing.codes_verified ? "default" : "outline"} className={listing.codes_verified ? "bg-green-500 text-white text-xs" : "text-xs"}>
                                      {listing.codes_verified ? (
                                        <span className="flex items-center gap-1">
                                          <Check className="h-3 w-3" /> Verified
                                        </span>
                                      ) : (
                                        <span className="flex items-center gap-1">
                                          <X className="h-3 w-3" /> Unverified
                                        </span>
                                      )}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-muted-foreground w-24">Green Tick:</span>
                                    <InlineEditableToggle
                                      toggleId={`${listing.id}-green-tick-desktop`}
                                      value={listing.green_tick}
                                      label={listing.green_tick ? '✓' : '✗'}
                                      onSave={(value) => onFieldUpdate(listing, 'green_tick', value)}
                                    />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-muted-foreground w-24">Gold Star:</span>
                                    <InlineEditableToggle
                                      toggleId={`${listing.id}-gold-star-desktop`}
                                      value={listing.gold_star}
                                      label={listing.gold_star ? '⭐' : '☆'}
                                      onSave={(value) => onFieldUpdate(listing, 'gold_star', value)}
                                    />
                                  </div>
                                  {listing.verification_date && (
                                    <span className="text-xs text-muted-foreground">
                                      Verified: {new Date(listing.verification_date).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                            ) : (
                              <TableCell className="hidden lg:table-cell">
                                <span className="text-xs text-muted-foreground">-</span>
                              </TableCell>
                            )}

                            <TableCell className="hidden md:table-cell">
                              <Badge variant="outline" className="text-xs">
                                {listing.listing_type || listing.type || '-'}
                              </Badge>
                            </TableCell>

                            <TableCell className="hidden xl:table-cell text-xs sm:text-sm">
                              {listing.created_at 
                                ? new Date(listing.created_at).toLocaleDateString() 
                                : listing.posted || '-'}
                            </TableCell>

                            <TableCell className="sticky right-0 z-10 bg-background text-right border-l whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                                  onClick={() => onViewDetails(listing.id, listing.listing_type)}
                                  title="View Details"
                                >
                                  <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                                  onClick={() => onEdit(listing.id, listing.listing_type)}
                                  title="Edit"
                                >
                                  <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                                </Button>
                                {canShowMarketplaceReject(listing) && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => onReject?.(listing.id, listing.listing_type)}
                                    title="Reject listing"
                                  >
                                    <Ban className="h-3 w-3 sm:h-4 sm:w-4" />
                                  </Button>
                                )}
                                {onDelete && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => onDelete(listing.id, listing.listing_type)}
                                    title="Delete"
                                  >
                                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>

                          {/* Expandable row for microchip details - Only for Sale and Stud listings, not Showcase or Marketplace */}
                          {expandedRows.has(listing.id) && !isNonVerificationListing(listing) && (
                            <TableRow className="bg-muted/30">
                              <TableCell colSpan={listings.some(l => !isNonVerificationListing(l)) ? 11 : 10} className="p-4">
                                <div className="space-y-4">
                                  <h4 className="font-semibold text-sm mb-3">Verification Details</h4>
                                  {listing.puppy_details && Array.isArray(listing.puppy_details) && listing.puppy_details.length > 0 ? (
                                    listing.puppy_details.map((puppy: any, index: number) => {
                                      // Try multiple possible field name variations
                                      const microchip = puppy.microchipNumber || puppy.microchip_number || puppy.microchip || '';
                                      const v1 = puppy.v1Code || puppy.v1_code || puppy.v1 || '';
                                      const v2 = puppy.v2Code || puppy.v2_code || puppy.v2 || '';
                                      const h1 = puppy.h1Code || puppy.h1_code || puppy.h1 || '';

                                      return (
                                        <div key={puppy.id || index} className="border rounded-lg p-4 space-y-3 bg-background">
                                          <h5 className="font-medium text-sm text-primary">
                                            Puppy {index + 1} {puppy.sex ? `(${puppy.sex})` : ''}
                                            {puppy.color ? ` - ${puppy.color}` : ''}
                                            {puppy.colourCollar ? ` - ${puppy.colourCollar} collar` : ''}
                                          </h5>
                                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                            <div>
                                              <label className="text-xs font-medium text-muted-foreground">Microchip Number</label>
                                              <p className="text-sm font-mono">
                                                {microchip || <span className="text-muted-foreground italic">Not provided</span>}
                                              </p>
                                            </div>
                                            <div>
                                              <label className="text-xs font-medium text-muted-foreground">V1 Code</label>
                                              <p className="text-sm font-mono">
                                                {v1 || <span className="text-muted-foreground italic">Not provided</span>}
                                              </p>
                                            </div>
                                            <div>
                                              <label className="text-xs font-medium text-muted-foreground">V2 Code</label>
                                              <p className="text-sm font-mono">
                                                {v2 || <span className="text-muted-foreground italic">Not provided</span>}
                                              </p>
                                            </div>
                                            <div>
                                              <label className="text-xs font-medium text-muted-foreground">H1 Code</label>
                                              <p className="text-sm font-mono">
                                                {h1 || <span className="text-muted-foreground italic">Not provided</span>}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <p className="text-sm text-muted-foreground">No puppy details available</p>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
