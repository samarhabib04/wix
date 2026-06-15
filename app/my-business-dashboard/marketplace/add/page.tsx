'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ImageUploader } from "@/components/seller-dashboard/forms/ImageUploader";

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

export default function AddProductPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [currentBusinessId, setCurrentBusinessId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    short_description: '',
    full_description: '',
    price: '',
    sale_price: '',
    stock_quantity: '',
    shipping_required: true,
    shipping_cost: '0.00',
    condition: 'new',
    brand: '',
  });
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  useEffect(() => {
    const fetchBusiness = async () => {
      if (!user) {
        router.push('/login');
        return;
      }

      try {
        setIsLoading(true);
        
        const { data: business, error: businessError } = await supabase
          .from('business_listings')
          .select('id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();

        if (businessError && businessError.code !== 'PGRST116') {
          console.error('Error fetching business:', businessError);
          toast({
            title: "Error",
            description: "Failed to load business information.",
            variant: "destructive",
          });
          router.push('/my-business-dashboard/marketplace');
          return;
        }

        if (!business) {
          toast({
            title: "Business Required",
            description: "Please create a business listing first.",
            variant: "destructive",
          });
          router.push('/my-business-dashboard');
          return;
        }

        setCurrentBusinessId((business as any).id);
      } catch (error) {
        console.error('Error in fetchBusiness:', error);
        router.push('/my-business-dashboard/marketplace');
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchBusiness();
    }
  }, [user, router, toast]);

  const handleSaveProduct = async () => {
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

    setIsSaving(true);
    try {
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to add a product",
          variant: "destructive",
        });
        return;
      }
      
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
        image_url: imageUrls[0] || null,
        status: 'draft',
        admin_approved: false,
        is_published: false,
        is_active: true,
      };

      const { error } = await supabase
        .from('marketplace_products' as any)
        .insert(productData);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Product created successfully. You can convert it to sale when ready!",
      });

      router.push('/my-business-dashboard/marketplace');
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save product",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add Product</h1>
          <p className="text-muted-foreground">
            Create a new marketplace product
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product Information</CardTitle>
          <CardDescription>
            Fill in all the details about your product. You can convert it to sale after setting up payment.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="name">Product Title *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Premium Dog Collar"
            />
          </div>
          
          <div>
            <Label htmlFor="category">Category *</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
              <SelectTrigger id="category">
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
            <Label htmlFor="short_description">Short Description *</Label>
            <Textarea
              id="short_description"
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
            <Label htmlFor="full_description">Full Description *</Label>
            <Textarea
              id="full_description"
              value={formData.full_description}
              onChange={(e) => setFormData({ ...formData, full_description: e.target.value })}
              placeholder="Detailed product description..."
              rows={6}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price">Price (€) *</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Original price (e.g. €59)
              </p>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="sale_price">Sale Price (€)</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Discounted price shown to customers (e.g. €50)
              </p>
              <Input
                id="sale_price"
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
            <Label htmlFor="images">Product Images *</Label>
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
              listingType="marketplace"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Upload up to 5 images. First image will be the main product image.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="stock_quantity">Stock Quantity *</Label>
              <Input
                id="stock_quantity"
                type="number"
                min="1"
                value={formData.stock_quantity}
                onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                placeholder="Enter stock quantity"
                required
              />
            </div>
            <div>
              <Label htmlFor="condition">Condition *</Label>
              <Select value={formData.condition} onValueChange={(value) => setFormData({ ...formData, condition: value })}>
                <SelectTrigger id="condition">
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
            <Label htmlFor="brand">Brand</Label>
            <Input
              id="brand"
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              placeholder="Optional brand name"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="shipping_required"
                checked={formData.shipping_required}
                onCheckedChange={(checked) => setFormData({ ...formData, shipping_required: checked as boolean })}
              />
              <Label htmlFor="shipping_required" className="cursor-pointer">
                Shipping Required
              </Label>
            </div>
            {formData.shipping_required && (
              <div>
                <Label htmlFor="shipping_cost">Shipping Cost (€)</Label>
                <Input
                  id="shipping_cost"
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

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This product will be saved as a draft. You can convert it to sale after setting up Stripe Connect. DogQuest charges a fixed €1 commission per sale.
            </AlertDescription>
          </Alert>

          <div className="flex justify-end gap-4 pt-4">
            <Button
              variant="outline"
              onClick={() => router.back()}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveProduct}
              disabled={isSaving}
              className="bg-brand-dark-green hover:bg-brand-soft-green"
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving...' : 'Add Product'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
