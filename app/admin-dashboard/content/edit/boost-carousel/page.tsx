'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, Loader2, Zap, TrendingUp, Crown, Award, Store, Building2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import {
  DEFAULT_BOOST_DISPLAY_NAMES,
  invalidateBoostConfigCache,
} from "@/hooks/useBoostConfig";

interface BoostConfig {
    id?: string;
    gold_boost_name: string;
    elite_boost_name: string;
    premium_boost_name: string;
    standard_boost_name: string;
    updated_at?: string;
}

interface MarketplaceBoostConfig {
    id?: string;
    boost_name: string;
    boost_amount: number; // stored in cents
    currency: string;
    updated_at?: string;
}

interface BusinessBoostConfig {
    id?: string;
    boost_name: string;
    boost_amount: number; // stored in cents
    currency: string;
    updated_at?: string;
}

const DEFAULT_CONFIG: BoostConfig = {
    gold_boost_name: DEFAULT_BOOST_DISPLAY_NAMES.gold,
    elite_boost_name: DEFAULT_BOOST_DISPLAY_NAMES.elite,
    premium_boost_name: DEFAULT_BOOST_DISPLAY_NAMES.premium,
    standard_boost_name: DEFAULT_BOOST_DISPLAY_NAMES.standard,
};

const DEFAULT_MARKETPLACE_CONFIG: MarketplaceBoostConfig = {
    boost_name: "Marketplace Boost",
    boost_amount: 1000, // €10 in cents
    currency: "EUR"
};

const DEFAULT_BUSINESS_CONFIG: BusinessBoostConfig = {
    boost_name: "Business Boost",
    boost_amount: 1000, // €10 in cents
    currency: "EUR"
};

export default function EditBoostCarouselPage() {
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);
    const [isSavingMarketplace, setIsSavingMarketplace] = useState(false);
    const [isSavingBusiness, setIsSavingBusiness] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [config, setConfig] = useState<BoostConfig>(DEFAULT_CONFIG);
    const [marketplaceConfig, setMarketplaceConfig] = useState<MarketplaceBoostConfig>(DEFAULT_MARKETPLACE_CONFIG);
    const [businessConfig, setBusinessConfig] = useState<BusinessBoostConfig>(DEFAULT_BUSINESS_CONFIG);

    useEffect(() => {
        loadConfig();
        loadMarketplaceConfig();
        loadBusinessConfig();
    }, []);

    const loadConfig = async () => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('boost_config' as any)
                .select('*')
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
                throw error;
            }

            if (data && !('error' in data)) {
                const row = data as unknown as BoostConfig;
                setConfig({
                    ...row,
                    standard_boost_name:
                        row.standard_boost_name == null ? "" : row.standard_boost_name,
                });
            }
        } catch (error: any) {
            console.error('Error loading boost config:', error);
            toast.error('Failed to load boost configuration');
        } finally {
            setIsLoading(false);
        }
    };

    const loadMarketplaceConfig = async () => {
        try {
            const { data, error } = await supabase
                .from('marketplace_boost_config' as any)
                .select('*')
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
                throw error;
            }

            if (data && !('error' in data)) {
                setMarketplaceConfig(data as unknown as MarketplaceBoostConfig);
            }
        } catch (error: any) {
            console.error('Error loading marketplace boost config:', error);
            toast.error('Failed to load marketplace boost configuration');
        }
    };

    const loadBusinessConfig = async () => {
        try {
            const { data, error } = await supabase
                .from('business_boost_config' as any)
                .select('*')
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
                throw error;
            }

            if (data && !('error' in data)) {
                setBusinessConfig(data as unknown as BusinessBoostConfig);
            }
        } catch (error: any) {
            console.error('Error loading business boost config:', error);
            toast.error('Failed to load business boost configuration');
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Check if config exists
            const { data: existingData } = await supabase
                .from('boost_config' as any)
                .select('id')
                .single();

            let result;
            if (existingData && !('error' in existingData)) {
                const existing = existingData as unknown as { id: string };
                // Update existing
                result = await supabase
                    .from('boost_config' as any)
                    .update({
                        gold_boost_name: config.gold_boost_name,
                        elite_boost_name: config.elite_boost_name,
                        premium_boost_name: config.premium_boost_name,
                        standard_boost_name: config.standard_boost_name,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existing.id);
            } else {
                // Insert new
                result = await supabase
                    .from('boost_config' as any)
                    .insert([{
                        gold_boost_name: config.gold_boost_name,
                        elite_boost_name: config.elite_boost_name,
                        premium_boost_name: config.premium_boost_name,
                        standard_boost_name: config.standard_boost_name
                    }]);
            }

            if (result.error) throw result.error;

            invalidateBoostConfigCache();
            toast.success('Listing boost configuration saved successfully!');
        } catch (error: any) {
            console.error('Error saving boost config:', error);
            toast.error(error.message || 'Failed to save boost configuration');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveMarketplace = async () => {
        setIsSavingMarketplace(true);
        try {
            // Validate boost amount (must be positive)
            if (marketplaceConfig.boost_amount <= 0) {
                toast.error('Boost amount must be greater than 0');
                setIsSavingMarketplace(false);
                return;
            }

            // Check if config exists
            const { data: existingData } = await supabase
                .from('marketplace_boost_config' as any)
                .select('id')
                .single();

            let result;
            if (existingData && !('error' in existingData)) {
                const existing = existingData as unknown as { id: string };
                // Update existing
                result = await supabase
                    .from('marketplace_boost_config' as any)
                    .update({
                        boost_name: marketplaceConfig.boost_name,
                        boost_amount: marketplaceConfig.boost_amount,
                        currency: marketplaceConfig.currency,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existing.id);
            } else {
                // Insert new
                result = await supabase
                    .from('marketplace_boost_config' as any)
                    .insert([{
                        boost_name: marketplaceConfig.boost_name,
                        boost_amount: marketplaceConfig.boost_amount,
                        currency: marketplaceConfig.currency
                    }]);
            }

            if (result.error) throw result.error;

            toast.success('Marketplace boost configuration saved successfully!');
        } catch (error: any) {
            console.error('Error saving marketplace boost config:', error);
            toast.error(error.message || 'Failed to save marketplace boost configuration');
        } finally {
            setIsSavingMarketplace(false);
        }
    };

    const handleSaveBusiness = async () => {
        setIsSavingBusiness(true);
        try {
            // Validate boost amount (must be positive)
            if (businessConfig.boost_amount <= 0) {
                toast.error('Boost amount must be greater than 0');
                setIsSavingBusiness(false);
                return;
            }

            // Check if config exists
            const { data: existingData } = await supabase
                .from('business_boost_config' as any)
                .select('id')
                .single();

            let result;
            if (existingData && !('error' in existingData)) {
                const existing = existingData as unknown as { id: string };
                // Update existing
                result = await supabase
                    .from('business_boost_config' as any)
                    .update({
                        boost_name: businessConfig.boost_name,
                        boost_amount: businessConfig.boost_amount,
                        currency: businessConfig.currency,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existing.id);
            } else {
                // Insert new
                result = await supabase
                    .from('business_boost_config' as any)
                    .insert([{
                        boost_name: businessConfig.boost_name,
                        boost_amount: businessConfig.boost_amount,
                        currency: businessConfig.currency
                    }]);
            }

            if (result.error) throw result.error;

            toast.success('Business listing boost configuration saved successfully!');
        } catch (error: any) {
            console.error('Error saving business boost config:', error);
            toast.error(error.message || 'Failed to save business boost configuration');
        } finally {
            setIsSavingBusiness(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-96">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                    <p className="text-muted-foreground">Loading configuration...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 w-full">
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    onClick={() => router.push('/admin-dashboard/content')}
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Content
                </Button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Boost Carousel Management</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage boost configurations for listing boosts and marketplace boosts separately
                    </p>
                </div>

                {/* Cancel Button - Top Right */}
                <div className="flex gap-3 flex-shrink-0">
                    <Button
                        variant="outline"
                        onClick={() => router.push('/admin-dashboard/content')}
                        disabled={isSaving || isSavingMarketplace || isSavingBusiness}
                    >
                        Cancel
                    </Button>
                </div>
            </div>

            {/* Listing Boost Management Card */}
            <Card className="w-full">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Crown className="h-5 w-5 text-yellow-600" />
                        Listing Boost Management
                    </CardTitle>
                    <CardDescription>
                        Seasonal headings for homepage carousels and marketing. Leave Standard empty for no section title on the homepage new-listings row; seller checkout and /boost still show Standard Boost on the tier card.
                        Optional env overrides (rebuild): NEXT_PUBLIC_BOOST_HEADING_GOLD, _ELITE, _PREMIUM, _STANDARD.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Gold Boost */}
                        <div className="space-y-2">
                            <Label htmlFor="gold" className="text-base font-semibold flex items-center gap-2">
                                <Crown className="h-4 w-4 text-yellow-600" />
                                Gold tier heading
                            </Label>
                            <Input
                                id="gold"
                                value={config.gold_boost_name}
                                onChange={(e) => setConfig({ ...config, gold_boost_name: e.target.value })}
                                placeholder="e.g. Tonight's Pawfect Picks"
                                className="text-lg"
                            />
                            <p className="text-sm text-muted-foreground">
                                Shown above the Gold boost carousel (homepage)
                            </p>
                        </div>

                        {/* Elite Boost */}
                        <div className="space-y-2">
                            <Label htmlFor="elite" className="text-base font-semibold flex items-center gap-2">
                                <Award className="h-4 w-4 text-purple-600" />
                                Elite tier heading
                            </Label>
                            <Input
                                id="elite"
                                value={config.elite_boost_name}
                                onChange={(e) => setConfig({ ...config, elite_boost_name: e.target.value })}
                                placeholder="e.g. Puppy in My Pocket"
                                className="text-lg"
                            />
                            <p className="text-sm text-muted-foreground">
                                Shown above the Elite boost carousel
                            </p>
                        </div>

                        {/* Premium Boost */}
                        <div className="space-y-2">
                            <Label htmlFor="premium" className="text-base font-semibold flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-blue-600" />
                                Premium tier heading
                            </Label>
                            <Input
                                id="premium"
                                value={config.premium_boost_name}
                                onChange={(e) => setConfig({ ...config, premium_boost_name: e.target.value })}
                                placeholder="e.g. Love at First Wag"
                                className="text-lg"
                            />
                            <p className="text-sm text-muted-foreground">
                                Shown above the Premium boost carousel
                            </p>
                        </div>

                        {/* Standard Boost */}
                        <div className="space-y-2">
                            <Label htmlFor="standard" className="text-base font-semibold flex items-center gap-2">
                                <Zap className="h-4 w-4 text-orange-600" />
                                Standard / new listings row heading (homepage)
                            </Label>
                            <Input
                                id="standard"
                                value={config.standard_boost_name}
                                onChange={(e) => setConfig({ ...config, standard_boost_name: e.target.value })}
                                placeholder="Empty = no homepage row title"
                                className="text-lg"
                            />
                            <p className="text-sm text-muted-foreground">
                                If empty, the mixed new listings row has no section title. Set a seasonal line when you want one (e.g. New Dogs & Puppies).
                            </p>
                        </div>
                    </div>

                    {/* Save Button for Listing Boosts */}
                    <div className="flex justify-end pt-4 border-t">
                        <Button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="min-w-[140px]"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Save Listing Boosts
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Marketplace Boost Management Card */}
            <Card className="w-full">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Store className="h-5 w-5 text-green-600" />
                        Marketplace Boost Management
                    </CardTitle>
                    <CardDescription>
                        Configure the boost feature name and amount for marketplace businesses
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Boost Name */}
                        <div className="space-y-2">
                            <Label htmlFor="marketplace-boost-name" className="text-base font-semibold flex items-center gap-2">
                                <Store className="h-4 w-4 text-green-600" />
                                Boost Name
                            </Label>
                            <Input
                                id="marketplace-boost-name"
                                value={marketplaceConfig.boost_name}
                                onChange={(e) => setMarketplaceConfig({ ...marketplaceConfig, boost_name: e.target.value })}
                                placeholder="Marketplace Boost"
                                className="text-lg"
                            />
                            <p className="text-sm text-muted-foreground">
                                The name displayed for marketplace business boosts
                            </p>
                        </div>

                        {/* Boost Amount */}
                        <div className="space-y-2">
                            <Label htmlFor="marketplace-boost-amount" className="text-base font-semibold flex items-center gap-2">
                                <Zap className="h-4 w-4 text-green-600" />
                                Boost Amount (€)
                            </Label>
                            <Input
                                id="marketplace-boost-amount"
                                type="number"
                                min="0"
                                step="0.01"
                                value={(marketplaceConfig.boost_amount / 100).toFixed(2)}
                                onChange={(e) => {
                                    const euroValue = parseFloat(e.target.value) || 0;
                                    setMarketplaceConfig({ ...marketplaceConfig, boost_amount: Math.round(euroValue * 100) });
                                }}
                                placeholder="10.00"
                                className="text-lg"
                            />
                            <p className="text-sm text-muted-foreground">
                                The price businesses pay per boost (in euros). Currently: €{(marketplaceConfig.boost_amount / 100).toFixed(2)}
                            </p>
                        </div>
                    </div>

                    {/* Save Button for Marketplace Boosts */}
                    <div className="flex justify-end pt-4 border-t">
                        <Button
                            onClick={handleSaveMarketplace}
                            disabled={isSavingMarketplace}
                            className="min-w-[140px]"
                        >
                            {isSavingMarketplace ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Save Marketplace Boosts
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Business Listing Boost Management Card */}
            <Card className="w-full">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-blue-600" />
                        Business Listing Boost Management
                    </CardTitle>
                    <CardDescription>
                        Configure the boost feature name and amount for business listings (appears in carousels on Puppies For Sale and Dogs For Stud pages)
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Boost Name */}
                        <div className="space-y-2">
                            <Label htmlFor="business-boost-name" className="text-base font-semibold flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-blue-600" />
                                Boost Name
                            </Label>
                            <Input
                                id="business-boost-name"
                                value={businessConfig.boost_name}
                                onChange={(e) => setBusinessConfig({ ...businessConfig, boost_name: e.target.value })}
                                placeholder="Business Boost"
                                className="text-lg"
                            />
                            <p className="text-sm text-muted-foreground">
                                The name displayed for business listing boosts
                            </p>
                        </div>

                        {/* Boost Amount */}
                        <div className="space-y-2">
                            <Label htmlFor="business-boost-amount" className="text-base font-semibold flex items-center gap-2">
                                <Zap className="h-4 w-4 text-blue-600" />
                                Boost Amount (€)
                            </Label>
                            <Input
                                id="business-boost-amount"
                                type="number"
                                min="0"
                                step="0.01"
                                value={(businessConfig.boost_amount / 100).toFixed(2)}
                                onChange={(e) => {
                                    const euroValue = parseFloat(e.target.value) || 0;
                                    setBusinessConfig({ ...businessConfig, boost_amount: Math.round(euroValue * 100) });
                                }}
                                placeholder="10.00"
                                className="text-lg"
                            />
                            <p className="text-sm text-muted-foreground">
                                The price businesses pay per boost (in euros). Currently: €{(businessConfig.boost_amount / 100).toFixed(2)}
                            </p>
                        </div>
                    </div>

                    {/* Save Button for Business Listing Boosts */}
                    <div className="flex justify-end pt-4 border-t">
                        <Button
                            onClick={handleSaveBusiness}
                            disabled={isSavingBusiness}
                            className="min-w-[140px]"
                        >
                            {isSavingBusiness ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Save Business Boosts
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
