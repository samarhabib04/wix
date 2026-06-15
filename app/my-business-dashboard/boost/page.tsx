'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, ShoppingBag, Check, Info, Clock, MapPin, Eye, TrendingUp, Zap, Phone, Mail } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BusinessBoostConfig {
  boost_name: string;
  boost_amount: number; // in cents
  currency: string;
  max_active_boosts: number;
}

interface MarketplaceBoostConfig {
  boost_name: string;
  boost_amount: number; // in cents
  currency: string;
}

export default function BusinessBoostPage() {
  const { user } = useAuth();
  const [businessBoostConfig, setBusinessBoostConfig] = useState<BusinessBoostConfig | null>(null);
  const [marketplaceBoostConfig, setMarketplaceBoostConfig] = useState<MarketplaceBoostConfig | null>(null);
  const [hasEliteSubscription, setHasEliteSubscription] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBoostConfigs = async () => {
      if (!user?.id) return;

      try {
        // Fetch business boost config
        const { data: businessConfig, error: businessError } = await supabase
          .from('business_boost_config' as any)
          .select('boost_name, boost_amount, currency, max_active_boosts')
          .single();

        if (!businessError && businessConfig) {
          setBusinessBoostConfig(businessConfig as unknown as BusinessBoostConfig);
        }

        // Fetch marketplace boost config
        const { data: marketplaceConfig, error: marketplaceError } = await supabase
          .from('marketplace_boost_config' as any)
          .select('boost_name, boost_amount, currency')
          .single();

        if (!marketplaceError && marketplaceConfig) {
          setMarketplaceBoostConfig(marketplaceConfig as unknown as MarketplaceBoostConfig);
        }

        // Check for elite subscription
        const { data: subscription } = await supabase
          .from('business_subscriptions' as any)
          .select('subscription_tier, status, end_date')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .eq('subscription_tier', 'elite_marketplace')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (subscription) {
          const sub = subscription as any;
          const isExpired = sub.end_date ? new Date(sub.end_date) < new Date() : false;
          if (!isExpired && sub.subscription_tier === 'elite_marketplace') {
            setHasEliteSubscription(true);
          }
        }
      } catch (error) {
        console.error('Error fetching boost configs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBoostConfigs();
  }, [user?.id]);

  const formatPrice = (amountInCents: number) => {
    return `€${(amountInCents / 100).toFixed(2)}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6 min-w-0 max-w-full">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Boost Your Business</h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">Loading boost information...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-6 min-w-0 max-w-full overflow-x-hidden">
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight break-words">Boost Your Business</h1>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base">
          Increase your visibility and reach more customers with our boost options
        </p>
      </div>

      {/* Important Note */}
      <Alert className="min-w-0">
        <Info className="h-4 w-4 shrink-0" />
        <AlertDescription className="text-sm break-words">
          <strong>Note:</strong> Business boosts are different from listing boosts (Standard/Premium/Elite/Gold). 
          Standard/Premium/Elite/Gold boosts are for sale and stud listings only. Business boosts are specifically 
          for your business listing and marketplace products.
        </AlertDescription>
      </Alert>

      {/* How Boosts Work Section */}
      <Card className="min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl min-w-0">
            <Info className="h-5 w-5 shrink-0" />
            <span className="break-words">How Boosts Work</span>
          </CardTitle>
          <CardDescription>
            Understanding the boost system and how it helps your business
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 min-w-0">
          <div className="grid md:grid-cols-2 gap-4 min-w-0">
            <div className="space-y-2 min-w-0">
              <h3 className="font-semibold flex items-center gap-2 min-w-0">
                <Eye className="h-4 w-4 shrink-0" />
                <span className="break-words">Increased Visibility</span>
              </h3>
              <p className="text-sm text-muted-foreground break-words">
                Boosted businesses appear in the "Featured Businesses" carousel on the homepage and at the top of relevant pages, giving you maximum exposure to potential customers.
              </p>
            </div>
            <div className="space-y-2 min-w-0">
              <h3 className="font-semibold flex items-center gap-2 min-w-0">
                <MapPin className="h-4 w-4 shrink-0" />
                <span className="break-words">Strategic Placement</span>
              </h3>
              <p className="text-sm text-muted-foreground break-words">
                Your business will be prominently displayed on the homepage carousel, service pages, and search results where customers are actively looking.
              </p>
            </div>
            <div className="space-y-2 min-w-0">
              <h3 className="font-semibold flex items-center gap-2 min-w-0">
                <Clock className="h-4 w-4 shrink-0" />
                <span className="break-words">Duration & Renewal</span>
              </h3>
              <p className="text-sm text-muted-foreground break-words">
                Business boosts remain active until they are pushed out by newer boosts (when the maximum active limit is reached) 
                or until you manually deactivate them. There is no fixed time limit. You can purchase new boosts at any time.
              </p>
            </div>
            <div className="space-y-2 min-w-0">
              <h3 className="font-semibold flex items-center gap-2 min-w-0">
                <TrendingUp className="h-4 w-4 shrink-0" />
                <span className="break-words">Maximum Active Boosts</span>
              </h3>
              <p className="text-sm text-muted-foreground break-words">
                There is a maximum number of active business boosts that can be displayed at once to ensure fair visibility for all businesses.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Where Boosts Appear Section */}
      <Card className="min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl break-words">Where Your Boosted Business Appears</CardTitle>
          <CardDescription>
            Your boosted business will be featured in these key locations across the site
          </CardDescription>
        </CardHeader>
        <CardContent className="min-w-0">
          <div className="grid md:grid-cols-2 gap-4 min-w-0">
            <div className="space-y-3 min-w-0">
              <h3 className="font-semibold break-words">Homepage</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="break-words">Featured in "Featured Businesses" carousel</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="break-words">Top placement on service listing pages</span>
                </li>
              </ul>
            </div>
            <div className="space-y-3 min-w-0">
              <h3 className="font-semibold break-words">Listing Pages & Search</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="break-words">Your business card appears on individual puppy listing pages (For Sale)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="break-words">Your business card appears on individual stud listing pages (Dogs For Stud)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="break-words">Priority placement in search results</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Boost Types Section */}
      <div className="min-w-0">
        <h2 className="text-xl sm:text-2xl font-semibold mb-4 break-words">Available Boosts</h2>
        <div className="grid md:grid-cols-2 gap-4 md:gap-6 min-w-0">
          {/* Business Listing Boost */}
          {businessBoostConfig && (
            <Card className="bg-blue-50 border-blue-200 border-2 min-w-0 overflow-hidden">
              <CardHeader className="space-y-4">
                <div className="flex flex-col gap-3 min-w-0 sm:flex-row sm:items-center">
                  <div className="p-2 rounded-lg bg-blue-100 shrink-0">
                    <Building2 className="h-6 w-6 text-blue-700" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-blue-700 text-lg sm:text-xl break-words">{businessBoostConfig.boost_name}</CardTitle>
                    <CardDescription className="mt-1 text-sm">Boost your business listing visibility</CardDescription>
                  </div>
                </div>
                <div className="mt-0 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-2xl sm:text-3xl font-bold tabular-nums">{formatPrice(businessBoostConfig.boost_amount)}</span>
                  <span className="text-muted-foreground text-sm sm:text-base">per boost</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 min-w-0">
                <div className="flex flex-wrap items-start gap-2 text-sm min-w-0">
                  <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="font-medium shrink-0">Max Active:</span>
                  <span className="text-muted-foreground break-words">{businessBoostConfig.max_active_boosts} businesses at once</span>
                </div>

                <div className="bg-blue-100/50 p-3 sm:p-4 rounded-lg mb-4 space-y-3 min-w-0 overflow-hidden">
                  <div className="min-w-0">
                    <p className="text-sm text-blue-900 font-medium mb-2">What is a Business Card?</p>
                    <p className="text-xs text-blue-800 break-words">
                      Your personalised business card will appear on puppy listing pages across DogQuest to increase 
                      visibility for your service. It displays your business information including name, logo, location, 
                      and contact details to potential customers viewing individual puppy listings (For Sale) and stud listings (Dogs For Stud).
                    </p>
                  </div>
                  
                  {/* Business Card Mock Preview - Homepage Carousel */}
                  <div className="mt-4 space-y-3 min-w-0">
                    <p className="text-xs text-blue-900 font-medium mb-2 break-words">Preview - Homepage Featured Businesses Carousel:</p>
                    <div className="bg-gray-50 p-2 sm:p-4 rounded-lg border border-blue-200 min-w-0 max-w-full overflow-hidden">
                      {/* Carousel Header */}
                      <div className="flex items-center gap-2 mb-3 sm:mb-4 min-w-0">
                        <Zap className="h-5 w-5 text-yellow-500 shrink-0" />
                        <h3 className="text-base sm:text-lg font-berkshire text-brand-dark-green truncate">Featured Businesses</h3>
                      </div>
                      
                      {/* Carousel Cards: stack on small phones, horizontal scroll on larger */}
                      <div className="flex flex-col gap-3 md:flex-row md:gap-3 md:overflow-x-auto md:pb-2 md:scrollbar-hide md:snap-x md:snap-mandatory min-w-0">
                        {/* Card 1 */}
                        <Card className="bg-white border-2 border-brand-soft-green/20 shadow-sm w-full md:w-[200px] md:flex-shrink-0 md:snap-start min-w-0">
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0">
                                  <Building2 className="h-5 w-5 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-xs text-gray-900 truncate">Your Business</h4>
                                  <p className="text-[10px] text-gray-600 truncate">Business Type</p>
                                </div>
                              </div>
                            </div>
                            <Badge className="bg-yellow-500 text-white text-[10px] px-1.5 py-0.5 mb-2">
                              <Zap className="h-2.5 w-2.5 mr-1" />
                              Featured
                            </Badge>
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
                                <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
                                <span className="truncate">County</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
                                <Phone className="h-2.5 w-2.5 flex-shrink-0" />
                                <span className="truncate">+353 XX XXX</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        
                        {/* Card 2 */}
                        <Card className="bg-white border-2 border-brand-soft-green/20 shadow-sm w-full md:w-[200px] md:flex-shrink-0 md:snap-start min-w-0">
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center flex-shrink-0">
                                  <Building2 className="h-5 w-5 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-xs text-gray-900 truncate">Another Business</h4>
                                  <p className="text-[10px] text-gray-600 truncate">Business Type</p>
                                </div>
                              </div>
                            </div>
                            <Badge className="bg-yellow-500 text-white text-[10px] px-1.5 py-0.5 mb-2">
                              <Zap className="h-2.5 w-2.5 mr-1" />
                              Featured
                            </Badge>
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
                                <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
                                <span className="truncate">County</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
                                <Phone className="h-2.5 w-2.5 flex-shrink-0" />
                                <span className="truncate">+353 XX XXX</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        
                        {/* Card 3 */}
                        <Card className="bg-white border-2 border-brand-soft-green/20 shadow-sm w-full md:w-[200px] md:flex-shrink-0 md:snap-start min-w-0">
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center flex-shrink-0">
                                  <Building2 className="h-5 w-5 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-xs text-gray-900 truncate">Third Business</h4>
                                  <p className="text-[10px] text-gray-600 truncate">Business Type</p>
                                </div>
                              </div>
                            </div>
                            <Badge className="bg-yellow-500 text-white text-[10px] px-1.5 py-0.5 mb-2">
                              <Zap className="h-2.5 w-2.5 mr-1" />
                              Featured
                            </Badge>
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
                                <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
                                <span className="truncate">County</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
                                <Phone className="h-2.5 w-2.5 flex-shrink-0" />
                                <span className="truncate">+353 XX XXX</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                    
                    {/* Business Card on Listing Page Preview */}
                    <div className="mt-4 min-w-0">
                      <p className="text-xs text-blue-900 font-medium mb-2 break-words">Preview - Business Card on Puppy Listing Pages:</p>
                      <Card className="bg-white border-2 border-blue-300 shadow-sm min-w-0 overflow-hidden">
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex items-start gap-2 sm:gap-3 min-w-0">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0">
                              <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-sm text-gray-900 mb-1 break-words">Your Business Name</h3>
                              <p className="text-xs text-gray-600 mb-2 break-words">Business Type • County</p>
                              <div className="space-y-1.5">
                                <div className="flex items-start gap-2 text-xs text-gray-600 min-w-0">
                                  <MapPin className="h-3 w-3 flex-shrink-0 mt-0.5" />
                                  <span className="break-words">Business Address, County</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-600 min-w-0">
                                  <Phone className="h-3 w-3 flex-shrink-0" />
                                  <span className="break-all">+353 XX XXX XXXX</span>
                                </div>
                                <div className="flex items-start gap-2 text-xs text-gray-600 min-w-0">
                                  <Mail className="h-3 w-3 flex-shrink-0 mt-0.5" />
                                  <span className="break-all">contact@business.com</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-sm mb-2">Features:</h4>
                  <ul className="space-y-1.5">
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Featured in "Featured Businesses" carousel on homepage</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Top placement on service listing pages</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Priority in search results</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-sm mb-2">Where Your Business Card Appears:</h4>
                  <ul className="space-y-1.5">
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>Homepage "Featured Businesses" carousel</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>Individual puppy listing pages (For Sale listings)</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>Individual stud listing pages (Dogs For Stud)</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>Top of service listing pages</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>Priority placement in search results</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-amber-50 border border-amber-200 p-3 sm:p-4 rounded-lg mt-4 min-w-0">
                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 text-amber-700 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-amber-900 mb-1">How Long Does the Boost Last?</p>
                      <p className="text-xs text-amber-800 break-words">
                        Your boost remains active until it is pushed out by newer boosts (when the maximum of {businessBoostConfig.max_active_boosts} active boosts is reached) 
                        or until you manually deactivate it. There is no fixed time limit - your boost stays active as long as there is space available. 
                        This means your business card will continue appearing on puppy listing pages until the maximum number of boosted businesses is reached.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Marketplace Product Boost */}
          {hasEliteSubscription && marketplaceBoostConfig && (
            <Card className="bg-purple-50 border-purple-200 border-2 min-w-0 overflow-hidden">
              <CardHeader className="space-y-4">
                <div className="flex flex-col gap-3 min-w-0 sm:flex-row sm:items-center">
                  <div className="p-2 rounded-lg bg-purple-100 shrink-0">
                    <ShoppingBag className="h-6 w-6 text-purple-700" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-purple-700 text-lg sm:text-xl break-words">{marketplaceBoostConfig.boost_name}</CardTitle>
                    <CardDescription className="mt-1 text-sm">Boost your marketplace product visibility</CardDescription>
                  </div>
                </div>
                <div className="mt-0 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-2xl sm:text-3xl font-bold tabular-nums">{formatPrice(marketplaceBoostConfig.boost_amount)}</span>
                  <span className="text-muted-foreground text-sm sm:text-base">per boost</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm mb-2">Features:</h4>
                  <ul className="space-y-1.5">
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Featured in "Featured Products" carousel on homepage</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Top placement on marketplace pages</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Priority in product search results</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Featured badge on product card</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-sm mb-2">Appears On:</h4>
                  <ul className="space-y-1.5">
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>Homepage "Featured Products" carousel</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>Top of marketplace product pages</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>Priority placement in product search</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          {!hasEliteSubscription && (
            <Card className="bg-gray-50 border-gray-200 border-2 opacity-60 min-w-0 overflow-hidden">
              <CardHeader>
                <div className="flex flex-col gap-3 min-w-0 sm:flex-row sm:items-center">
                  <div className="p-2 rounded-lg bg-gray-100 shrink-0">
                    <ShoppingBag className="h-6 w-6 text-gray-500" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-gray-500 text-lg sm:text-xl break-words">Marketplace Product Boost</CardTitle>
                    <CardDescription className="mt-1 text-sm">Requires Elite Marketplace subscription</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="min-w-0">
                <p className="text-sm text-muted-foreground break-words">
                  To boost marketplace products, you need an active Elite Marketplace subscription. 
                  Upgrade your subscription to access product boosting features.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Getting Started */}
      <Card className="bg-brand-light-green/10 border-brand-soft-green min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl break-words">Ready to Boost Your Business?</CardTitle>
          <CardDescription className="text-sm">
            Start increasing your visibility and reaching more customers today
          </CardDescription>
        </CardHeader>
        <CardContent className="min-w-0">
          <p className="text-sm text-muted-foreground mb-4 break-words">
            To purchase a boost for your business listing, navigate to your business listing page and look for the "Boost" option. 
            For marketplace products, go to your marketplace dashboard and boost individual products.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Badge variant="outline" className="bg-white justify-start whitespace-normal h-auto py-1.5 px-2 text-left">
              <Info className="h-3 w-3 mr-1 shrink-0" />
              <span className="break-words">Boost your business from the listing page</span>
            </Badge>
            <Badge variant="outline" className="bg-white justify-start whitespace-normal h-auto py-1.5 px-2 text-left">
              <Clock className="h-3 w-3 mr-1 shrink-0" />
              <span className="break-words">Instant activation after payment</span>
            </Badge>
            <Badge variant="outline" className="bg-white justify-start whitespace-normal h-auto py-1.5 px-2 text-left">
              <TrendingUp className="h-3 w-3 mr-1 shrink-0" />
              <span className="break-words">Track your boost performance</span>
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
