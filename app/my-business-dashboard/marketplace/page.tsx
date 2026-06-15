'use client';

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit, Trash2, Package, CheckCircle, XCircle, Clock, AlertTriangle, Zap, Currency, TrendingUp, DollarSign, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ImageUploader } from "@/components/seller-dashboard/forms/ImageUploader";
import { RefundPolicyModal } from "@/components/marketplace/RefundPolicyModal";
import { FileText } from "lucide-react";
import { isStripeConnectReadyFromCheckStatus } from "@/lib/utils/stripe-connect";
import { StripeConnectOnboarding } from "@/components/business/StripeConnectOnboarding";

interface MarketplaceProduct {
  id: string;
  business_id: string;
  user_id: string;
  name: string;
  description?: string;
  short_description?: string;
  full_description?: string;
  price: number;
  sale_price?: number | null;
  image_url: string | null;
  images?: string[] | null;
  category?: string | null;
  stock_quantity: number;
  shipping_required: boolean;
  shipping_cost: number;
  condition: string;
  brand?: string | null;
  status: 'draft' | 'pending_approval' | 'live';
  admin_approved: boolean;
  is_published: boolean;
  is_active: boolean;
  boost_enabled?: boolean;
  created_at: string;
  updated_at: string;
}

const PRODUCT_CATEGORIES = [
  'Nutrition',
  'Health & Wellness',
  'Training & Behaviour',
  'Grooming',
  'Active Play',
  'Beds & Crates',
  'Collars, Leads & Harnesses',
  'Travel & Living',
  'Cleaning & Hygiene',
  'Puppy Essentials'
] as const;

export default function BusinessMarketplacePage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<MarketplaceProduct | null>(null);
  const [currentBusinessId, setCurrentBusinessId] = useState<string | null>(null);
  const [hasEliteSubscription, setHasEliteSubscription] = useState(false);
  const [stripeConnectReady, setStripeConnectReady] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    short_description: '',
    full_description: '',
    price: '',
    sale_price: '',
    stock_quantity: '0',
    shipping_required: true,
    shipping_cost: '0.00',
    condition: 'new',
    brand: '',
  });
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [convertingProductId, setConvertingProductId] = useState<string | null>(null);
  const [earnings, setEarnings] = useState({
    totalEarnings: 0,
    totalSales: 0,
    pendingPayouts: 0,
  });
  const [isLoadingEarnings, setIsLoadingEarnings] = useState(false);
  const [boostConfig, setBoostConfig] = useState<{ boost_name: string; boost_amount: number; currency: string } | null>(null);
  const [productBoosts, setProductBoosts] = useState<Map<string, any>>(new Map());
  const [processingBoost, setProcessingBoost] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 6;
  const [productSalesCount, setProductSalesCount] = useState<Map<string, number>>(new Map());
  const [refundPolicyModalOpen, setRefundPolicyModalOpen] = useState(false);
  const [currentRefundPolicy, setCurrentRefundPolicy] = useState<string | null>(null);

  useEffect(() => {
    const fetchBusiness = async () => {
      if (!user) {
        setIsCheckingPayment(false);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        // Don't set isCheckingPayment to true here - only set it when we actually need to check
        
        // Get user's business
        const { data: business, error: businessError } = await supabase
        .from('business_listings')
        .select('id, subscription_tier, refund_policy')
        .eq('user_id', user.id)
        .limit(1)
          .maybeSingle();

        if (businessError && businessError.code !== 'PGRST116') {
          console.error('Error fetching business:', businessError);
          setIsLoading(false);
          setIsCheckingPayment(false);
          return;
        }

        if (!business) {

          setIsLoading(false);
          setIsCheckingPayment(false);
          return;
        }

        const businessId = (business as any).id;
        setCurrentBusinessId(businessId);
        setCurrentRefundPolicy((business as any).refund_policy || null);

        // Check subscription from business_subscriptions table by user_id only
        // Only fetch active subscriptions for consistency

        const { data: subscription, error: subError } = await supabase
          .from('business_subscriptions' as any)
          .select('subscription_tier, status, end_date')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        let isElite = false;
        if (!subError && subscription) {
          const sub = subscription as any;

          // Check if subscription tier is elite_marketplace
          // If subscription exists with elite_marketplace tier, allow access regardless of status
          if (sub.subscription_tier === 'elite_marketplace') {

            isElite = true;
          } else {

          }
        } else {
          if (subError) {
            console.error('Error querying subscription:', subError);
          } else {

          }
        }

        setHasEliteSubscription(isElite);
        
        // Only fetch products and check Stripe status if user has elite subscription
        if (isElite && businessId) {

          fetchProducts();
          await checkStripeConnectStatus();
          fetchEarnings(businessId);
          fetchBoostConfig();
        } else {
          // If no elite subscription, stop checking payment and set empty products

          setProducts([]);
          setIsCheckingPayment(false);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error in fetchBusiness:', error);
        setIsLoading(false);
        setIsCheckingPayment(false);
        // On error, redirect to subscription page
        router.replace('/my-business-dashboard/subscription');
      }
    };

    if (user) {
    fetchBusiness();
    } else {
      // If no user, redirect to login or dashboard
      router.replace('/my-business-dashboard');
    }
  }, [user, router]);

  // Check for boost success in URL params and refresh boosts
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('boost_success') === 'true' && currentBusinessId) {
      // Refresh product boosts
      if (products.length > 0) {
        fetchProductBoosts(products.map(p => p.id));
      }
      // Show success toast
      toast({
        title: "Boost Purchased! 🎉",
        description: "Your product boost is now active",
      });
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [currentBusinessId, products]);

  // Reset to page 1 when products change
  useEffect(() => {
    setCurrentPage(1);
  }, [products.length]);

  // Real-time subscription for marketplace sales
  useEffect(() => {
    if (!currentBusinessId || !hasEliteSubscription) return;

    const salesChannel = supabase
      .channel(`marketplace-sales:${currentBusinessId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'marketplace_sales',
          filter: `business_id=eq.${currentBusinessId}`,
        },
        (payload) => {

          // Refresh earnings data immediately
          fetchEarnings(currentBusinessId);
          
          // Refresh products to get updated stock quantities
          fetchProducts();
          
          // Refresh product sales count
          if (products.length > 0) {
            fetchProductSalesCount(products.map(p => p.id));
          }
          
          // Show toast notification for new sales
          if (payload.eventType === 'INSERT' && payload.new) {
            const sale = payload.new as any;
            if (sale.payment_status === 'paid') {
              toast({
                title: "New Sale! 🎉",
                description: `Customer purchased your product - €${((sale.business_payout_amount || 0) / 100).toFixed(2)}`,
              });
            }
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const sale = payload.new as any;
            const oldSale = payload.old as any;
            
            // Check if payout_status changed to completed
            if (sale.payout_status === 'completed' && oldSale?.payout_status !== 'completed') {
              toast({
                title: "Payment Received! 💰",
                description: `€${((sale.business_payout_amount || 0) / 100).toFixed(2)} has been transferred to your Stripe account`,
              });
            }
            
            // Check if payout_status changed to failed
            if (sale.payout_status === 'failed' && oldSale?.payout_status !== 'failed') {
              toast({
                title: "Transfer Failed ⚠️",
                description: `Payment transfer failed. Please check your Stripe account.`,
                variant: "destructive",
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(salesChannel);
    };
  }, [currentBusinessId, hasEliteSubscription, toast]);

  const checkStripeConnectStatus = async () => {
    try {
      setIsCheckingPayment(true);
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 10000); // 10 second timeout
      });
      
      const fetchPromise = supabase.functions.invoke('manage-stripe-account', {
        body: { action: 'check_status' }
      });

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;

      if (!error && data) {
        setStripeConnectReady(isStripeConnectReadyFromCheckStatus(data));
      }
    } catch (error: any) {
      console.error('Error checking Stripe Connect status:', error);
      // On error or timeout, assume not ready
      setStripeConnectReady(false);
    } finally {
      setIsCheckingPayment(false);
    }
  };

  const fetchProducts = async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('marketplace_products' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts((data as any) || []);
      
      // Fetch active boosts and sales count for all products
      if ((data as any)?.length > 0) {
        const productIds = (data as any).map((p: any) => p.id);
        fetchProductBoosts(productIds);
        fetchProductSalesCount(productIds);
      }
    } catch (error: any) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBoostConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('marketplace_boost_config' as any)
        .select('boost_name, boost_amount, currency')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching boost config:', error);
        // Use defaults
        setBoostConfig({
          boost_name: 'Marketplace Boost',
          boost_amount: 1000,
          currency: 'EUR'
        });
        return;
      }

      if (data && !('error' in data)) {
        setBoostConfig(data);
      } else {
        // Use defaults if no config exists
        setBoostConfig({
          boost_name: 'Marketplace Boost',
          boost_amount: 1000,
          currency: 'EUR'
        });
      }
    } catch (error: any) {
      console.error('Error loading boost config:', error);
      setBoostConfig({
        boost_name: 'Marketplace Boost',
        boost_amount: 1000,
        currency: 'EUR'
      });
    }
  };

  const fetchProductBoosts = async (productIds: string[]) => {
    if (!productIds || productIds.length === 0) return;

    try {
      const { data, error } = await supabase
        .from('marketplace_product_boosts' as any)
        .select('*')
        .in('product_id', productIds)
        .eq('is_active', true)
        .eq('payment_status', 'paid')
        .order('boost_start_time', { ascending: false });

      if (error) {
        console.error('Error fetching product boosts:', error);
        return;
      }

      // Create a map of product_id -> boost
      const boostsMap = new Map<string, any>();
      (data || []).forEach((boost: any) => {
        if (!boostsMap.has(boost.product_id)) {
          boostsMap.set(boost.product_id, boost);
        }
      });
      setProductBoosts(boostsMap);
    } catch (error: any) {
      console.error('Error fetching product boosts:', error);
    }
  };

  const fetchProductSalesCount = async (productIds: string[]) => {
    if (!productIds || productIds.length === 0) return;

    try {
      const { data, error } = await supabase
        .from('marketplace_sales' as any)
        .select('product_id, quantity')
        .in('product_id', productIds)
        .eq('payment_status', 'paid');

      if (error) {
        console.error('Error fetching product sales count:', error);
        return;
      }

      // Create a map of product_id -> total quantity sold
      const salesMap = new Map<string, number>();
      (data || []).forEach((sale: any) => {
        const currentCount = salesMap.get(sale.product_id) || 0;
        salesMap.set(sale.product_id, currentCount + (sale.quantity || 1));
      });
      setProductSalesCount(salesMap);
    } catch (error: any) {
      console.error('Error fetching product sales count:', error);
    }
  };

  const handleBoostProduct = async (productId: string) => {
    if (!currentBusinessId || !user || !boostConfig) {
      toast({
        title: "Error",
        description: "Missing required information",
        variant: "destructive",
      });
      return;
    }

    setProcessingBoost(productId);

    try {
      // Create Stripe checkout session for product boost
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          mode: 'payment',
          productType: 'marketplace_product_boost',
          businessListingId: currentBusinessId,
          productId: productId,
          planDetails: {
            id: 'marketplace_product_boost',
            name: `${boostConfig.boost_name} - Product`,
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

  const fetchEarnings = async (businessId: string) => {
    try {
      setIsLoadingEarnings(true);
      
      // Fetch all sales for this business
      const { data: sales, error } = await (supabase as any)
        .from('marketplace_sales')
        .select(`
          *,
          marketplace_products!product_id (
            name
          )
        `)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching sales:', error);
        return;
      }

      if (sales && sales.length > 0) {
        // Calculate totals
        const totalEarnings = sales
          .filter((s: any) => s.payout_status === 'completed')
          .reduce((sum: number, s: any) => sum + (s.business_payout_amount || 0), 0);
        
        const totalSales = sales.filter((s: any) => s.payment_status === 'paid').length;
        
        const pendingPayouts = sales
          .filter((s: any) => s.payout_status === 'pending' && s.payment_status === 'paid')
          .reduce((sum: number, s: any) => sum + (s.business_payout_amount || 0), 0);

        setEarnings({
          totalEarnings: totalEarnings / 100, // Convert cents to euros
          totalSales,
          pendingPayouts: pendingPayouts / 100, // Convert cents to euros
        });
      } else {
        setEarnings({ totalEarnings: 0, totalSales: 0, pendingPayouts: 0 });
      }
    } catch (error: any) {
      console.error('Error fetching earnings:', error);
    } finally {
      setIsLoadingEarnings(false);
    }
  };

  const handleCreateProduct = () => {
    router.push('/my-business-dashboard/marketplace/add');
  };

  const handleEditProduct = (product: MarketplaceProduct) => {
    // Allow editing drafts and live products
    // Live products will require re-approval after editing
    setEditingProduct(product);
    const images = product.images && Array.isArray(product.images) ? product.images : 
                   (product.image_url ? [product.image_url] : []);
    
    setFormData({
      name: product.name,
      category: product.category || '',
      short_description: product.short_description || '',
      full_description: product.full_description || product.description || '',
      price: product.price.toString(),
      sale_price: product.sale_price ? product.sale_price.toString() : '',
      stock_quantity: product.stock_quantity?.toString() || '0',
      shipping_required: product.shipping_required ?? true,
      shipping_cost: product.shipping_cost?.toString() || '0.00',
      condition: product.condition || 'new',
      brand: product.brand || '',
    });
    setImageUrls(images);
    setDialogOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!editingProduct) return; // Only handle edits in modal
    if (!currentBusinessId) {
      toast({
        title: "Error",
        description: "Business not found",
        variant: "destructive",
      });
      return;
    }

    // Validate required fields
    if (!formData.name || !formData.category || !formData.short_description || !formData.full_description || !formData.price) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields (Title, Category, Short Description, Full Description, Price)",
        variant: "destructive",
      });
      return;
    }

    const price = parseFloat(formData.price);
    if (isNaN(price) || price <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid price greater than 0",
        variant: "destructive",
      });
      return;
    }

    const salePrice = formData.sale_price ? parseFloat(formData.sale_price) : null;
    if (salePrice !== null && (isNaN(salePrice) || salePrice <= 0)) {
      toast({
        title: "Validation Error",
        description: "Sale price must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    // Validate stock quantity - must be greater than 0
    const stockQuantity = parseInt(formData.stock_quantity);
    if (isNaN(stockQuantity) || stockQuantity <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a stock quantity greater than 0",
        variant: "destructive",
      });
      return;
    }

    // Validate condition
    if (!formData.condition) {
      toast({
        title: "Validation Error",
        description: "Please select a product condition",
        variant: "destructive",
      });
      return;
    }

    if (imageUrls.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please upload at least one product image",
        variant: "destructive",
      });
      return;
    }

    try {
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to save a product",
          variant: "destructive",
        });
        return;
      }

      // When editing a product, always require re-approval
      // Set status to pending_approval, admin_approved to false, and is_published to false
      const productData: any = {
        business_id: currentBusinessId,
        user_id: user.id,
        name: formData.name,
        description: formData.short_description, // Keep for backward compatibility
        category: formData.category,
        short_description: formData.short_description,
        full_description: formData.full_description,
        price: price,
        sale_price: salePrice,
        stock_quantity: stockQuantity,
        shipping_required: formData.shipping_required,
        shipping_cost: parseFloat(formData.shipping_cost) || 0,
        condition: formData.condition,
        brand: formData.brand || null,
        images: imageUrls,
        image_url: imageUrls[0] || null, // Keep for backward compatibility
        status: 'pending_approval', // Always set to pending_approval when edited
        admin_approved: false, // Always require re-approval after editing
        is_published: false, // Always unpublish when edited
        is_active: true,
        // Note: Boosts are stored in marketplace_product_boosts table and will persist
        // They are linked by product_id, so they remain active even after product status changes
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('marketplace_products' as any)
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Product updated successfully. It has been set to pending approval and will require admin review before going live again. Your active boosts will be preserved.",
        });
      } else {
        const { error } = await supabase
          .from('marketplace_products' as any)
          .insert(productData);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Product draft created successfully. Convert to sale when ready!",
        });
      }

      if (editingProduct) {
      setDialogOpen(false);
        setEditingProduct(null);
      }
      fetchProducts();
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save product",
        variant: "destructive",
      });
    }
  };

  const handleConvertToSale = async (productId: string) => {
    if (!stripeConnectReady) {
      toast({
        title: "Payment Setup Required",
        description: "Please complete Stripe Connect setup before converting to sale.",
        variant: "destructive",
      });
      return;
    }

    setConvertingProductId(productId);
    try {
      const { error } = await supabase
        .from('marketplace_products' as any)
        .update({ status: 'pending_approval' })
        .eq('id', productId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Product submitted for approval. Admin will review it shortly.",
      });

      fetchProducts();
    } catch (error: any) {
      console.error('Error converting product:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to convert product to sale",
        variant: "destructive",
      });
    } finally {
      setConvertingProductId(null);
    }
  };

  const handleDeleteClick = (productId: string) => {
    setProductToDelete(productId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete || !currentBusinessId) return;

    try {
      const { error } = await supabase
        .from('marketplace_products' as any)
        .delete()
        .eq('id', productToDelete);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Product deleted successfully",
      });

      setDeleteDialogOpen(false);
      setProductToDelete(null);
      fetchProducts();
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive",
      });
    }
  };

  const getProductStatus = (product: MarketplaceProduct) => {
    return product.status || 'draft';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 w-auto">
            <Clock className="h-3 w-3 mr-1" />
            Draft
          </Badge>
        );
      case 'pending_approval':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 w-auto">
            <Clock className="h-3 w-3 mr-1" />
            Pending Approval
          </Badge>
        );
      case 'live':
        return (
          <Badge variant="default" className="bg-green-600 w-auto">
            <CheckCircle className="h-3 w-3 mr-1" />
            Live
          </Badge>
        );
      default:
        return null;
    }
  };

  // Show loading state while checking subscription or payment
  if (isLoading || isCheckingPayment) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Marketplace</h1>
          <p className="text-muted-foreground">
            Sell physical dog products through DogQuest
          </p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-muted-foreground">
              {isCheckingPayment ? 'Checking payment setup...' : 'Loading...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Restrict access - only elite_marketplace users can access
  if (!hasEliteSubscription) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Marketplace</h1>
          <p className="text-muted-foreground">
            Sell physical dog products through DogQuest
          </p>
        </div>
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <AlertTriangle className="h-16 w-16 mx-auto text-amber-500" />
              <h2 className="text-2xl font-bold">Upgrade to Marketplace Plan</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                You need an Elite Marketplace subscription to access the marketplace and sell products. 
                Upgrade your plan to start selling physical dog products through DogQuest.
              </p>
              <div className="pt-4">
                <Button 
                  onClick={() => router.push('/my-business-dashboard/subscription')}
                  className="bg-brand-dark-green hover:bg-brand-soft-green"
                >
                  View Plans & Upgrade
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Marketplace</h1>
        <p className="text-muted-foreground">
          Manage your marketplace products
        </p>
      </div>

      {/* Stripe Connect — complete here so users don't need a dashboard round-trip */}
      {hasEliteSubscription && !stripeConnectReady && currentBusinessId && (
        <div id="marketplace-payment-setup" className="space-y-3">
          <Alert className="border-amber-500 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-900">
              Connect Stripe below to submit products for sale. This is separate from your Elite subscription payment.
            </AlertDescription>
          </Alert>
          <StripeConnectOnboarding
            businessId={currentBusinessId}
            onSetupComplete={() => {
              void checkStripeConnectStatus();
            }}
          />
        </div>
      )}

      {/* Earnings Display */}
      {hasEliteSubscription && currentBusinessId && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Earnings</p>
                  <p className="text-2xl font-bold">
                    {isLoadingEarnings ? (
                      <span className="text-muted-foreground">...</span>
                    ) : (
                      `€${earnings.totalEarnings.toFixed(2)}`
                    )}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <Currency className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Sales</p>
                  <p className="text-2xl font-bold">
                    {isLoadingEarnings ? (
                      <span className="text-muted-foreground">...</span>
                    ) : (
                      earnings.totalSales
                    )}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending Payouts</p>
                  <p className="text-2xl font-bold">
                    {isLoadingEarnings ? (
                      <span className="text-muted-foreground">...</span>
                    ) : (
                      `€${earnings.pendingPayouts.toFixed(2)}`
                    )}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Products List */}
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <CardTitle>Your Products</CardTitle>
              <CardDescription>
                Create product drafts and convert them to sale when ready. Products require admin approval before appearing in the shop.
              </CardDescription>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button 
                variant="outline"
                size="sm"
                onClick={() => setRefundPolicyModalOpen(true)}
              >
                <FileText className="mr-2 h-4 w-4" />
                Refund Policy
              </Button>
              <Button size="sm" onClick={handleCreateProduct}>
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading products...</div>
          ) : products.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">No products yet</p>
              <Button onClick={handleCreateProduct}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Product
              </Button>
            </div>
          ) : (
            <>
              {/* Products Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products
                  .slice((currentPage - 1) * productsPerPage, currentPage * productsPerPage)
                  .map((product) => {
                    const status = getProductStatus(product);
                    const mainImage = (product.images && Array.isArray(product.images) && product.images[0]) || product.image_url;
                    const displayPrice = product.sale_price ? product.sale_price : product.price;
                    const originalPrice = product.sale_price ? product.price : null;
                    
                    return (
                      <Card
                        key={product.id}
                        className="flex flex-col hover:shadow-lg transition-shadow"
                      >
                        {/* Product Image */}
                        {mainImage && (
                          <div className="relative w-full h-48 overflow-hidden rounded-t-lg">
                            <img
                              src={mainImage}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute top-2 left-2 flex flex-col gap-2">
                              {getStatusBadge(status)}
                              {productBoosts.has(product.id) && (
                                <Badge variant="default" className="bg-yellow-500 w-auto">
                                  <Zap className="h-3 w-3 mr-1" />
                                  Boosted
                                </Badge>
                              )}
                            </div>
                            {product.category && (
                              <div className="absolute top-2 right-2">
                                <Badge variant="outline" className="bg-white/90 w-auto">
                                  {product.category}
                                </Badge>
                              </div>
                            )}
                          </div>
                        )}
                        
                        <CardContent className="flex-1 flex flex-col p-4">
                          {/* Product Title */}
                          <h3 className="font-semibold text-lg mb-2 line-clamp-2">{product.name}</h3>
                          
                          {/* Description */}
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
                            {product.short_description || product.description}
                          </p>
                          
                          {/* Price and Stock */}
                          <div className="mb-4">
                            <div className="flex items-center gap-2 mb-1">
                              {originalPrice && (
                                <span className="text-sm text-muted-foreground line-through">
                                  €{originalPrice.toFixed(2)}
                                </span>
                              )}
                              <p className="text-xl font-bold">€{displayPrice.toFixed(2)}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm text-muted-foreground">
                                Stock: {product.stock_quantity || 0} left
                              </p>
                              {productSalesCount.has(product.id) && (
                                <p className="text-xs text-muted-foreground">
                                  Sold: {productSalesCount.get(product.id)} units
                                </p>
                              )}
                            </div>
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex flex-col gap-2 mt-auto">
                            {status === 'draft' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditProduct(product)}
                                  className="w-full"
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Edit
                                </Button>
                                {stripeConnectReady ? (
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => handleConvertToSale(product.id)}
                                    disabled={convertingProductId === product.id}
                                    className="bg-brand-dark-green hover:bg-brand-soft-green w-full"
                                  >
                                    {convertingProductId === product.id ? (
                                      'Converting...'
                                    ) : (
                                      <>
                                        <CheckCircle className="h-4 w-4 mr-1" />
                                        Convert to Sale
                                      </>
                                    )}
                                  </Button>
                                ) : (
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => {
                                      document
                                        .getElementById('marketplace-payment-setup')
                                        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }}
                                    className="bg-red-600 hover:bg-red-700 text-white w-full"
                                  >
                                    <AlertTriangle className="h-4 w-4 mr-1" />
                                    Payment Setup
                                  </Button>
                                )}
                              </>
                            )}
                            {status === 'pending_approval' && (
                              <div className="text-center py-2">
                                <span className="text-sm text-muted-foreground">Awaiting approval</span>
                              </div>
                            )}
                            {status === 'live' && (
                              <div className="space-y-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditProduct(product)}
                                  className="w-full"
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Edit Product
                                </Button>
                                {!productBoosts.has(product.id) && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleBoostProduct(product.id)}
                                      disabled={processingBoost === product.id || !boostConfig}
                                      className="border-yellow-500 text-yellow-600 hover:bg-yellow-50 w-full"
                                    >
                                      <Zap className="h-4 w-4 mr-1" />
                                      {processingBoost === product.id 
                                        ? 'Processing...' 
                                        : `Boost ${boostConfig ? `(€${(boostConfig.boost_amount / 100).toFixed(2)})` : ''}`}
                                    </Button>
                                    <div 
                                      className="bg-amber-50 border border-amber-200 rounded-md p-2.5 cursor-pointer hover:bg-amber-100 transition-colors"
                                      onClick={() => router.push('/my-business-dashboard/boost')}
                                    >
                                      <div className="flex items-start gap-2">
                                        <Info className="h-3.5 w-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
                                        <div className="text-xs text-amber-900 space-y-1">
                                          <p className="leading-tight font-medium">Featured placement in "Featured Products" carousel on homepage and marketplace pages.</p>
                                          <p className="leading-tight text-amber-700">Duration: Active until pushed out by newer boosts.</p>
                                        </div>
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteClick(product.id)}
                              className="w-full"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
              
              {/* Pagination */}
              {products.length > productsPerPage && (
                <div className="mt-6 flex justify-center">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage > 1) setCurrentPage(currentPage - 1);
                          }}
                          className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                      {Array.from({ length: Math.ceil(products.length / productsPerPage) }, (_, i) => i + 1).map((page) => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setCurrentPage(page);
                            }}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage < Math.ceil(products.length / productsPerPage)) {
                              setCurrentPage(currentPage + 1);
                            }
                          }}
                          className={currentPage >= Math.ceil(products.length / productsPerPage) ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog - For editing drafts and live products */}
      {editingProduct && (
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
                Update your product details. After saving, the product will be set to pending approval and will require admin review before going live again. Your active boosts will be preserved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
                <Label htmlFor="edit_name">Product Title *</Label>
              <Input
                  id="edit_name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Premium Dog Collar"
              />
            </div>
              
              <div>
                <Label htmlFor="edit_category">Category *</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger id="edit_category">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit_short_description">Short Description *</Label>
                <Textarea
                  id="edit_short_description"
                  value={formData.short_description}
                  onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
                  placeholder="Brief description (max 200 characters)..."
                  rows={2}
                  maxLength={200}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.short_description.length}/200 characters
                </p>
              </div>

            <div>
                <Label htmlFor="edit_full_description">Full Description *</Label>
              <Textarea
                  id="edit_full_description"
                  value={formData.full_description}
                  onChange={(e) => setFormData({ ...formData, full_description: e.target.value })}
                  placeholder="Detailed product description..."
                  rows={6}
              />
            </div>

              <div className="grid grid-cols-2 gap-4">
            <div>
                  <Label htmlFor="edit_price">Price (€) *</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Original price (e.g. €59)
                  </p>
              <Input
                    id="edit_price"
                type="number"
                step="0.01"
                min="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
                  <Label htmlFor="edit_sale_price">Sale Price (€)</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Discounted price shown to customers (e.g. €50)
                  </p>
                  <Input
                    id="edit_sale_price"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.sale_price}
                    onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit_images">Product Images *</Label>
              <ImageUploader
                value={imageUrls}
                onImagesSelected={(urls) => {
                  setImageUrls(urls);
                }}
                onImageDeleted={(index) => {
                  const newUrls = imageUrls.filter((_, i) => i !== index);
                  setImageUrls(newUrls);
                }}
                  maxImages={5}
                bucketName="marketplace-products"
                folder="products"
              />
                <p className="text-xs text-muted-foreground mt-1">
                  Upload up to 5 images. First image will be the main product image.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit_stock_quantity">Stock Quantity *</Label>
                  <Input
                    id="edit_stock_quantity"
                    type="number"
                    min="1"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                    placeholder="Enter stock quantity"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit_condition">Condition *</Label>
                  <Select value={formData.condition} onValueChange={(value) => setFormData({ ...formData, condition: value })}>
                    <SelectTrigger id="edit_condition">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="used">Used</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="edit_brand">Brand</Label>
                <Input
                  id="edit_brand"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  placeholder="Optional brand name"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit_shipping_required"
                    checked={formData.shipping_required}
                    onCheckedChange={(checked) => setFormData({ ...formData, shipping_required: checked as boolean })}
                  />
                  <Label htmlFor="edit_shipping_required" className="cursor-pointer">
                    Shipping Required
                  </Label>
                </div>
                {formData.shipping_required && (
                  <div>
                    <Label htmlFor="edit_shipping_cost">Shipping Cost (€)</Label>
                    <Input
                      id="edit_shipping_cost"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.shipping_cost}
                      onChange={(e) => setFormData({ ...formData, shipping_cost: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProduct}>
                Update Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      )}

      {/* Refund Policy Modal */}
      {currentBusinessId && (
        <RefundPolicyModal
          open={refundPolicyModalOpen}
          onOpenChange={(open) => {
            setRefundPolicyModalOpen(open);
            // Refresh refund policy when modal closes
            if (!open && currentBusinessId) {
              supabase
                .from('business_listings')
                .select('refund_policy')
                .eq('id', currentBusinessId)
                .single()
                .then(({ data }) => {
                  if (data) {
                    setCurrentRefundPolicy((data as any).refund_policy || null);
                  }
                });
            }
          }}
          businessId={currentBusinessId}
          currentPolicy={currentRefundPolicy}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this product? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
