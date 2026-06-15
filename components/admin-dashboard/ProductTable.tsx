
import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { adminToast } from "@/lib/utils/adminToast";
import { Pencil, Trash2, Plus, ImageIcon } from "lucide-react";
import { ImageUploader } from "@/components/seller-dashboard/forms/ImageUploader";
import AdminTable from "./AdminTable";
import TruncatedCellText from "./TruncatedCellText";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  valued_at?: number;
  image_url: string | null;
  images?: string[];
  badge: string | null;
  in_stock: boolean;
  /** Units available (admin shop). */
  stock_quantity?: number;
  slug: string;
  created_at?: string;
  updated_at?: string;
}

const emptyProduct: Omit<Product, "id" | "slug" | "created_at" | "updated_at"> = {
  name: "",
  description: "",
  price: 0,
  valued_at: 0,
  image_url: "",
  images: [],
  badge: "",
  in_stock: true,
  stock_quantity: 0,
};

const ProductTable: React.FC = () => {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product>>(emptyProduct);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [newImageUrls, setNewImageUrls] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [primaryImageIndex, setPrimaryImageIndex] = useState(0);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
      if (error) {
        throw error;
      }
      setProducts((data || []).map(item => ({
        ...item,
        valued_at: item.valued_at ?? undefined,
        images: item.images ?? undefined,
        badge: item.badge ?? undefined,
        free_shipping: item.free_shipping ?? undefined,
        stock_quantity: typeof item.stock_quantity === "number" ? item.stock_quantity : 0,
      })) as Product[]);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({
        title: "Error",
        description: "Failed to fetch products. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleCreateProduct = () => {
    setCurrentProduct(emptyProduct);
    setNewImageUrls([]);
    setExistingImages([]);
    setPrimaryImageIndex(0);
    setIsDialogOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setCurrentProduct(product);
    setNewImageUrls([]);
    setExistingImages(product.images || []);
    setPrimaryImageIndex(0);
    setIsDialogOpen(true);
  };

  const handleDeleteProduct = (product: Product) => {
    setProductToDelete(product);
    setIsDeleteDialogOpen(true);
  };

  // Helper function to generate a temporary slug for new products
  const generateTemporarySlug = (productName: string): string => {
    // Convert to lowercase and replace spaces with hyphens
    let slug = productName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-');
    
    // Add a timestamp to ensure uniqueness
    slug += `-${Date.now().toString().substring(9)}`;
    
    return slug;
  };

  const handleSaveProduct = async () => {
    try {
      if (!currentProduct.name || !currentProduct.description || !currentProduct.price) {
        toast({
          title: "Missing information",
          description: "Please fill out all required fields",
          variant: "destructive",
        });
        return;
      }

      // Combine existing images with newly uploaded images
      const combinedImages = [
        ...existingImages,
        ...newImageUrls
      ];
      
      // If there's no primary image_url but we have images, use the first image
      let imageUrl = currentProduct.image_url;
      if ((!imageUrl || imageUrl === '') && combinedImages.length > 0) {
        imageUrl = combinedImages[primaryImageIndex] || combinedImages[0];
      }

      const qty = Math.max(0, Math.floor(Number(currentProduct.stock_quantity ?? 0)));
      const inStock = qty > 0;

      let response;
      if (currentProduct.id) {
        // Update existing product
        response = await supabase
          .from("products")
          .update({
            name: currentProduct.name,
            description: currentProduct.description,
            price: currentProduct.price,
            valued_at: currentProduct.valued_at,
            image_url: imageUrl,
            images: combinedImages.length > 0 ? combinedImages : null,
            badge: currentProduct.badge || null,
            stock_quantity: qty,
            in_stock: inStock,
            updated_at: new Date().toISOString(),
          })
          .eq("id", currentProduct.id);
      } else {
        // Create new product with a temporary slug
        response = await supabase.from("products").insert({
          name: currentProduct.name,
          description: currentProduct.description,
          price: currentProduct.price,
          valued_at: currentProduct.valued_at,
          image_url: imageUrl,
          images: combinedImages.length > 0 ? combinedImages : null,
          badge: currentProduct.badge || null,
          stock_quantity: qty,
          in_stock: inStock,
          slug: generateTemporarySlug(currentProduct.name)
        });
      }

      if (response.error) {
        throw response.error;
      }

      toast({
        title: currentProduct.id ? "Product Updated" : "Product Created",
        description: `${currentProduct.name} has been ${currentProduct.id ? "updated" : "created"} successfully.`,
      });

      setIsDialogOpen(false);
      fetchProducts();
    } catch (error) {
      console.error("Error saving product:", error);
      toast({
        title: "Error",
        description: `Failed to ${currentProduct.id ? "update" : "create"} product. Please try again.`,
        variant: "destructive",
      });
    }
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;

    try {
      const { error } = await supabase.from("products").delete().eq("id", productToDelete.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Product Deleted",
        description: `${productToDelete.name} has been deleted successfully.`,
      });

      setIsDeleteDialogOpen(false);
      fetchProducts();
    } catch (error) {
      console.error("Error deleting product:", error);
      toast({
        title: "Error",
        description: "Failed to delete product. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleImageDeleted = (index: number) => {
    if (index < existingImages.length) {
      // Delete from existing images
      const updatedExistingImages = [...existingImages];
      updatedExistingImages.splice(index, 1);
      setExistingImages(updatedExistingImages);
      
      // Adjust primary index if necessary
      if (index === primaryImageIndex) {
        setPrimaryImageIndex(0);
      } else if (index < primaryImageIndex) {
        setPrimaryImageIndex(primaryImageIndex - 1);
      }
    } else {
      // Delete from newly uploaded images
      const newImageIndex = index - existingImages.length;
      const updatedNewImages = [...newImageUrls];
      updatedNewImages.splice(newImageIndex, 1);
      setNewImageUrls(updatedNewImages);
      
      // Adjust primary index if necessary
      if (index === primaryImageIndex) {
        setPrimaryImageIndex(0);
      } else if (index < primaryImageIndex) {
        setPrimaryImageIndex(primaryImageIndex - 1);
      }
    }
  };

  const columns = [
    {
      key: "image",
      label: "Image",
      width: "w-[80px]",
      render: (value: any, row: Product) => (
        row.image_url ? (
          <img
            src={row.image_url}
            alt={row.name}
            className="w-12 h-12 object-cover rounded"
          />
        ) : (
          <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
            <ImageIcon className="w-6 h-6 text-gray-400" />
          </div>
        )
      )
    },
    { key: "name", label: "Name" },
    { 
      key: "description", 
      label: "Description",
      render: (value: string) => (
        <TruncatedCellText text={value} maxChars={40} className="max-w-xs" />
      )
    },
    { 
      key: "price", 
      label: "Price",
      render: (value: number) => `€${Number(value).toFixed(2)}`
    },
    {
      key: "stock_quantity",
      label: "Stock",
      render: (_value: unknown, row: Product) => {
        const n = Math.max(0, row.stock_quantity ?? 0);
        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold tabular-nums text-foreground">{n}</span>
            <span className="text-xs text-muted-foreground">
              {n > 0 ? "units" : "out of stock"}
            </span>
          </div>
        );
      },
    },
    {
      key: "badge",
      label: "Badge",
      render: (value: string | null) => value || "-"
    }
  ];

  const actions = [
    {
      label: "Edit",
      onClick: (product: Product) => handleEditProduct(product)
    },
    {
      label: "Delete",
      onClick: (product: Product) => handleDeleteProduct(product),
      variant: "destructive" as const,
      separator: true
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Button onClick={handleCreateProduct} className="gap-2 bg-brand-soft-green hover:bg-brand-dark-green">
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </div>

      <AdminTable 
        data={products} 
        columns={columns} 
        actions={actions}
        isLoading={isLoading}
        emptyMessage="No products in your shop yet. Start by adding your first product to begin selling items to your customers."
      />

      {/* Edit/Create Product Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{currentProduct.id ? "Edit Product" : "Create New Product"}</DialogTitle>
            <DialogDescription>
              {currentProduct.id
                ? "Make changes to the existing product."
                : "Add a new product to your shop."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="col-span-1">
                Name*
              </Label>
              <Input
                id="name"
                value={currentProduct.name || ""}
                onChange={(e) =>
                  setCurrentProduct({ ...currentProduct, name: e.target.value })
                }
                className="col-span-3"
                placeholder="Product name"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="col-span-1">
                Description*
              </Label>
              <Textarea
                id="description"
                value={currentProduct.description || ""}
                onChange={(e) =>
                  setCurrentProduct({
                    ...currentProduct,
                    description: e.target.value,
                  })
                }
                className="col-span-3"
                placeholder="Product description"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="price" className="col-span-1">
                Price (€)*
              </Label>
              <Input
                id="price"
                type="number"
                value={currentProduct.price || ""}
                onChange={(e) =>
                  setCurrentProduct({
                    ...currentProduct,
                    price: parseFloat(e.target.value) || 0,
                  })
                }
                className="col-span-3"
                placeholder="0.00"
                min="0"
                step="0.01"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="valued_at" className="col-span-1">
                Valued at (€)
              </Label>
              <Input
                id="valued_at"
                type="number"
                value={currentProduct.valued_at || ""}
                onChange={(e) =>
                  setCurrentProduct({
                    ...currentProduct,
                    valued_at: parseFloat(e.target.value) || 0,
                  })
                }
                className="col-span-3"
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="badge" className="col-span-1">
                Badge
              </Label>
              <Input
                id="badge"
                value={currentProduct.badge || ""}
                onChange={(e) =>
                  setCurrentProduct({
                    ...currentProduct,
                    badge: e.target.value || null,
                  })
                }
                className="col-span-3"
                placeholder="e.g. Breeder Favourite, New, Sale, etc."
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="stock_quantity" className="col-span-1">
                Stock quantity
              </Label>
              <div className="col-span-3 space-y-1">
                <Input
                  id="stock_quantity"
                  type="number"
                  min={0}
                  step={1}
                  value={currentProduct.stock_quantity ?? 0}
                  onChange={(e) => {
                    const v = Math.max(0, Math.floor(parseInt(e.target.value, 10) || 0));
                    setCurrentProduct({
                      ...currentProduct,
                      stock_quantity: v,
                      in_stock: v > 0,
                    });
                  }}
                  className="max-w-[200px]"
                />
                <p className="text-xs text-muted-foreground">
                  Units available. Set to 0 for out of stock (shown on the shop accordingly).
                </p>
              </div>
            </div>
            
            {/* Product Images Section */}
            <div className="grid grid-cols-4 gap-4">
              <Label className="col-span-1 pt-2">
                Images
              </Label>
              <div className="col-span-3">
                <ImageUploader 
                  value={newImageUrls}
                  existingImages={existingImages}
                  onImageDeleted={handleImageDeleted}
                  onImagesSelected={setNewImageUrls}
                  onSetAsPrimary={setPrimaryImageIndex}
                  primaryImageIndex={primaryImageIndex}
                  maxImages={6}
                  bucketName="product-images"
                  folder="products"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Upload up to 6 product images. The first image will be used as the main product image.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProduct} className="bg-brand-soft-green hover:bg-brand-dark-green">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the product "{productToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex space-x-2 justify-end">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              variant="destructive"
            >
              Delete Product
            </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductTable;
