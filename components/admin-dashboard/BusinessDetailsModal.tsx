import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Phone, Mail, Globe, MapPin, Calendar, Star, Clock, Eye, TrendingUp } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import PartnerBadge from "@/components/ui/partner-badge";
import { format } from "date-fns";

interface BusinessData {
  id: string;
  name: string;
  type: string;
  location: string;
  rating: number;
  reviewCount: number;
  status: string;
  featured: boolean;
  joinDate: string;
  email: string;
  phone: string;
  website?: string;
  description: string;
  adminApproved: boolean;
  banner_image?: string | null;
  logo_image?: string | null;
  address?: string;
  social?: any;
  admin_notes?: string | null;
  coordinates?: any;
  county?: string;
  created_at?: string;
  updated_at?: string;
  current_boost_id?: string | null;
  is_vet_partner?: boolean;
  profile_image?: string | null;
  profile_image_url?: string | null;
  refund_policy?: string | null;
  reviews_list?: any;
  slug?: string;
  stripe_subscription_id?: string | null;
  subscription_billing_period?: string | null;
  subscription_end_date?: string | null;
  subscription_start_date?: string | null;
  subscription_tier?: string | null;
  user_id?: string;
  vet_partner_invited_at?: string | null;
  vet_partner_invited_by_admin?: string | null;
  vet_partner_stripe_subscription_id?: string | null;
  vet_partner_subscription_end?: string | null;
  vet_partner_subscription_start?: string | null;
  vet_partner_tier?: string | null;
  views?: number;
  opening_hours?: any;
}

interface BusinessDetailsModalProps {
  business: BusinessData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BusinessDetailsModal: React.FC<BusinessDetailsModalProps> = ({
  business,
  open,
  onOpenChange,
}) => {
  const isMobile = useIsMobile();

  if (!business) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Pending Approval':
      case 'Draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'Rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${isMobile ? 'max-w-[95vw] h-[90vh]' : 'max-w-2xl max-h-[85vh]'} overflow-y-auto`}>
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-xl font-bold text-left">
            Business Details
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Business Header */}
          <div className="border-b pb-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{business.name}</h3>
                <p className="text-muted-foreground text-sm">{business.type}</p>
              </div>
              <div className="flex flex-col gap-2">
                <Badge className={`w-fit ${getStatusColor(business.status)}`}>
                  {business.status}
                </Badge>
                {business.featured && (
                  <PartnerBadge />
                )}
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">
              Contact Information
            </h4>
            <div className="grid gap-3">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <a 
                  href={`mailto:${business.email}`}
                  className="text-sm text-blue-600 hover:underline break-all"
                >
                  {business.email}
                </a>
              </div>
              {business.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <a 
                    href={`tel:${business.phone}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {business.phone}
                  </a>
                </div>
              )}
              {business.website && (
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <a 
                    href={business.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline break-all"
                  >
                    {business.website}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Location & Business Info */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">
              Business Information
            </h4>
            <div className="grid gap-3">
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm">{business.location}</span>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm">Joined: {business.joinDate}</span>
              </div>
              <div className="flex items-center gap-3">
                <Star className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm">
                  {business.rating.toFixed(1)} rating ({business.reviewCount} reviews)
                </span>
              </div>
            </div>
          </div>

          {/* Images */}
          {(business.banner_image || business.logo_image || business.profile_image) && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">
                Images
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {business.logo_image && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Logo</p>
                    <div className="relative w-full h-24 border rounded overflow-hidden bg-muted">
                      <img
                        src={business.logo_image}
                        alt="Logo"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  </div>
                )}
                {business.banner_image && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Banner</p>
                    <div className="relative w-full h-24 border rounded overflow-hidden bg-muted">
                      <img
                        src={business.banner_image}
                        alt="Banner"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  </div>
                )}
                {business.profile_image && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Profile</p>
                    <div className="relative w-full h-24 border rounded overflow-hidden bg-muted">
                      <img
                        src={business.profile_image}
                        alt="Profile"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          {business.description && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">
                Description
              </h4>
              <p className="text-sm leading-relaxed">{business.description}</p>
            </div>
          )}

          {/* Address Details */}
          {(business.address || business.county) && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">
                Address
              </h4>
              <div className="text-sm">
                {business.address && <p>{business.address}</p>}
                {business.county && (
                  <p className={business.address ? "text-muted-foreground" : ""}>
                    {business.county}, Ireland
                  </p>
                )}
                {!business.address && !business.county && business.location && (
                  <p>{business.location}</p>
                )}
              </div>
            </div>
          )}

          {/* Opening Hours */}
          {business.opening_hours && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">
                Opening Hours
              </h4>
              <div className="text-sm space-y-1">
                {Array.isArray(business.opening_hours) ? (
                  business.opening_hours.map((dayData: any, index: number) => {
                    if (typeof dayData === 'object' && dayData !== null) {
                      const { day, isClosed, openTime, closeTime, is24Hours } = dayData;
                      return (
                        <div key={index} className="flex justify-between">
                          <span className="capitalize font-medium">{day || `Day ${index + 1}`}:</span>
                          <span>
                            {isClosed 
                              ? 'Closed' 
                              : is24Hours 
                              ? '24 Hours' 
                              : openTime && closeTime 
                              ? `${openTime} - ${closeTime}` 
                              : 'Not specified'}
                          </span>
                        </div>
                      );
                    }
                    return null;
                  })
                ) : typeof business.opening_hours === 'object' ? (
                  Object.entries(business.opening_hours).map(([day, hours]: [string, any]) => {
                    if (typeof hours === 'object' && hours !== null) {
                      const { isClosed, openTime, closeTime, is24Hours } = hours;
                      return (
                        <div key={day} className="flex justify-between">
                          <span className="capitalize font-medium">{day}:</span>
                          <span>
                            {isClosed 
                              ? 'Closed' 
                              : is24Hours 
                              ? '24 Hours' 
                              : openTime && closeTime 
                              ? `${openTime} - ${closeTime}` 
                              : 'Not specified'}
                          </span>
                        </div>
                      );
                    }
                    return (
                      <div key={day} className="flex justify-between">
                        <span className="capitalize font-medium">{day}:</span>
                        <span>{hours || 'Closed'}</span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-muted-foreground">Opening hours not available</p>
                )}
              </div>
            </div>
          )}

          {/* Social Media */}
          {business.social && typeof business.social === 'object' && Object.keys(business.social).length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">
                Social Media
              </h4>
              <div className="flex flex-wrap gap-2">
                {business.social.facebook && (
                  <a href={business.social.facebook} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                    Facebook
                  </a>
                )}
                {business.social.instagram && (
                  <a href={business.social.instagram} target="_blank" rel="noopener noreferrer" className="text-sm text-pink-600 hover:underline">
                    Instagram
                  </a>
                )}
                {business.social.tiktok && (
                  <a href={business.social.tiktok} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-800 hover:underline">
                    TikTok
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Refund Policy */}
          {business.refund_policy && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">
                Refund Policy
              </h4>
              <p className="text-sm leading-relaxed">{business.refund_policy}</p>
            </div>
          )}

          {/* Subscription Information */}
          {(business.subscription_tier || business.stripe_subscription_id) && (
            <div className="space-y-3 border-t pt-4">
              <h4 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">
                Subscription Information
              </h4>
              <div className="grid gap-2 text-sm">
                {business.subscription_tier && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tier:</span>
                    <Badge>{business.subscription_tier}</Badge>
                  </div>
                )}
                {business.subscription_start_date && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Start Date:</span>
                    <span>{format(new Date(business.subscription_start_date), 'MMM dd, yyyy')}</span>
                  </div>
                )}
                {business.subscription_end_date && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">End Date:</span>
                    <span>{format(new Date(business.subscription_end_date), 'MMM dd, yyyy')}</span>
                  </div>
                )}
                {business.subscription_billing_period && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Billing Period:</span>
                    <span className="capitalize">{business.subscription_billing_period}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Vet Partner Information */}
          {business.is_vet_partner && (
            <div className="space-y-3 border-t pt-4">
              <h4 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">
                Vet Partner Information
              </h4>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vet Partner:</span>
                  <Badge variant="default">Yes</Badge>
                </div>
                {business.vet_partner_tier && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vet Partner Tier:</span>
                    <Badge>{business.vet_partner_tier}</Badge>
                  </div>
                )}
                {business.vet_partner_subscription_start && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vet Subscription Start:</span>
                    <span>{format(new Date(business.vet_partner_subscription_start), 'MMM dd, yyyy')}</span>
                  </div>
                )}
                {business.vet_partner_subscription_end && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vet Subscription End:</span>
                    <span>{format(new Date(business.vet_partner_subscription_end), 'MMM dd, yyyy')}</span>
                  </div>
                )}
                {business.vet_partner_invited_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Invited At:</span>
                    <span>{format(new Date(business.vet_partner_invited_at), 'MMM dd, yyyy')}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Business Statistics */}
          <div className="space-y-3 border-t pt-4">
            <h4 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">
              Statistics
            </h4>
            <div className="grid gap-2 text-sm">
              {business.views !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Eye className="h-3 w-3" />
                    Views:
                  </span>
                  <span className="font-medium">{business.views.toLocaleString()}</span>
                </div>
              )}
              {business.current_boost_id && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-3 w-3" />
                    Boost Active:
                  </span>
                  <Badge variant="default">Yes</Badge>
                </div>
              )}
            </div>
          </div>

          {/* Timestamps */}
          <div className="space-y-3 border-t pt-4">
            <h4 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">
              Timestamps
            </h4>
            <div className="grid gap-2 text-sm">
              {business.created_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    Created:
                  </span>
                  <span>{format(new Date(business.created_at), 'MMM dd, yyyy HH:mm')}</span>
                </div>
              )}
              {business.updated_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    Last Updated:
                  </span>
                  <span>{format(new Date(business.updated_at), 'MMM dd, yyyy HH:mm')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Admin Information */}
          <div className="space-y-3 border-t pt-4">
            <h4 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">
              Admin Information
            </h4>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Admin Approved:</span>
                <Badge variant={business.adminApproved ? "default" : "secondary"}>
                  {business.adminApproved ? "Yes" : "No"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Partner Status:</span>
                <Badge variant={business.featured ? "default" : "secondary"}>
                  {business.featured ? "Partner" : "Standard"}
                </Badge>
              </div>
              {business.admin_notes && (
                <div className="mt-2">
                  <span className="text-muted-foreground block mb-1">Admin Notes:</span>
                  <p className="text-sm bg-muted p-2 rounded">{business.admin_notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
            {business.website && (
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-2"
                onClick={() => window.open(business.website, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
                Visit Website
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open(`mailto:${business.email}`, '_self')}
            >
              <Mail className="h-4 w-4" />
              Send Email
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BusinessDetailsModal;
