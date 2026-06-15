'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit, Trash2, Calendar, Image as ImageIcon, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { compressImageForUpload } from "@/lib/media/compressImage";

interface Promotion {
  id: string;
  title: string;
  description: string | null;
  banner_image_url: string | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
  admin_approved: boolean;
  created_at: string;
}

export default function BusinessPromotionsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [promotionToDelete, setPromotionToDelete] = useState<string | null>(null);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [currentBusinessId, setCurrentBusinessId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    banner_image_url: '',
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    const fetchBusiness = async () => {
      if (!user) return;

      const { data: business, error } = await supabase
        .from('business_listings')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching business:', error);
        return;
      }

      if (business) {
        setCurrentBusinessId(business.id);
        fetchPromotions(business.id);
      }
    };

    fetchBusiness();
  }, [user]);

  const fetchPromotions = async (businessId: string) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('business_promotions' as any)
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPromotions((data as any) || []);
    } catch (error: any) {
      console.error('Error fetching promotions:', error);
      toast({
        title: "Error",
        description: "Failed to load promotions",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePromotion = () => {
    setEditingPromotion(null);
    setFormData({
      title: '',
      description: '',
      banner_image_url: '',
      start_date: '',
      end_date: '',
    });
    setDialogOpen(true);
  };

  const handleEditPromotion = (promotion: Promotion) => {
    if (promotion.is_active) {
      toast({
        title: "Cannot Edit",
        description: "Cannot edit an active promotion. Please deactivate it first.",
        variant: "destructive",
      });
      return;
    }

    setEditingPromotion(promotion);
    setFormData({
      title: promotion.title,
      description: promotion.description || '',
      banner_image_url: promotion.banner_image_url || '',
      start_date: format(new Date(promotion.start_date), 'yyyy-MM-dd'),
      end_date: format(new Date(promotion.end_date), 'yyyy-MM-dd'),
    });
    setDialogOpen(true);
  };

  const handleSavePromotion = async () => {
    if (!currentBusinessId) {
      toast({
        title: "Error",
        description: "Business not found",
        variant: "destructive",
      });
      return;
    }

    if (!formData.title || !formData.start_date || !formData.end_date) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Calculate end date (30 days from start)
    const startDate = new Date(formData.start_date);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 30);

    // Ensure end_date is not before the calculated 30-day period
    const userEndDate = new Date(formData.end_date);
    const finalEndDate = userEndDate > endDate ? userEndDate : endDate;

    try {
      if (editingPromotion) {
        const { error } = await supabase
          .from('business_promotions' as any)
          .update({
            title: formData.title,
            description: formData.description || null,
            banner_image_url: formData.banner_image_url || null,
            start_date: startDate.toISOString(),
            end_date: finalEndDate.toISOString(),
            admin_approved: false, // Reset approval when edited
          })
          .eq('id', editingPromotion.id);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Promotion updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('business_promotions' as any)
          .insert({
            business_id: currentBusinessId,
            title: formData.title,
            description: formData.description || null,
            banner_image_url: formData.banner_image_url || null,
            start_date: startDate.toISOString(),
            end_date: finalEndDate.toISOString(),
            is_active: false,
            admin_approved: false,
          });

        if (error) throw error;
        toast({
          title: "Success",
          description: "Promotion created successfully. Awaiting admin approval.",
        });
      }

      setDialogOpen(false);
      if (currentBusinessId) {
        fetchPromotions(currentBusinessId);
      }
    } catch (error: any) {
      console.error('Error saving promotion:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save promotion",
        variant: "destructive",
      });
    }
  };

  const handleDeletePromotion = async () => {
    if (!promotionToDelete) return;

    try {
      const { error } = await supabase
        .from('business_promotions' as any)
        .delete()
        .eq('id', promotionToDelete);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Promotion deleted successfully",
      });

      setDeleteDialogOpen(false);
      setPromotionToDelete(null);
      if (currentBusinessId) {
        fetchPromotions(currentBusinessId);
      }
    } catch (error: any) {
      console.error('Error deleting promotion:', error);
      toast({
        title: "Error",
        description: "Failed to delete promotion",
        variant: "destructive",
      });
    }
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const processed = await compressImageForUpload(file, "promotion");
      const fileExt = processed.name.includes(".")
        ? processed.name.split(".").pop()
        : "webp";
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `promotions/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('business-assets')
        .upload(filePath, processed);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('business-assets')
        .getPublicUrl(filePath);

      setFormData({ ...formData, banner_image_url: data.publicUrl });
      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
    }
  };

  if (!currentBusinessId) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              You need to create a business listing first.
            </p>
            <Button
              className="mt-4"
              onClick={() => router.push('/my-business-dashboard/listing')}
            >
              Create Business Listing
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Promotions</h1>
          <p className="text-muted-foreground">
            Create and manage promotional banners for your business profile
          </p>
        </div>
        <Button onClick={handleCreatePromotion}>
          <Plus className="mr-2 h-4 w-4" />
          Create Promotion
        </Button>
      </div>

      {/* Promotions List */}
      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Loading promotions...</p>
          </CardContent>
        </Card>
      ) : promotions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground mb-4">No promotions yet</p>
            <Button onClick={handleCreatePromotion}>
              Create Your First Promotion
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {promotions.map((promotion) => (
            <Card key={promotion.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold">{promotion.title}</h3>
                      {promotion.is_active && (
                        <Badge variant="default">Active</Badge>
                      )}
                      {!promotion.admin_approved && (
                        <Badge variant="secondary">Pending Approval</Badge>
                      )}
                    </div>
                    {promotion.description && (
                      <p className="text-muted-foreground mb-2">{promotion.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {format(new Date(promotion.start_date), 'MMM d, yyyy')} -{' '}
                          {format(new Date(promotion.end_date), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                    {promotion.banner_image_url && (
                      <div className="mt-4">
                        <img
                          src={promotion.banner_image_url}
                          alt={promotion.title}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditPromotion(promotion)}
                      disabled={promotion.is_active}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPromotionToDelete(promotion.id);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingPromotion ? 'Edit Promotion' : 'Create Promotion'}
            </DialogTitle>
            <DialogDescription>
              Promotions run for 30 days and require admin approval
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title *</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Promotion title"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Promotion description"
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Banner Image</label>
              <div className="flex items-center gap-4">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadImage}
                  className="hidden"
                  id="banner-upload"
                />
                <label htmlFor="banner-upload">
                  <Button variant="outline" type="button" asChild>
                    <span>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Image
                    </span>
                  </Button>
                </label>
                {formData.banner_image_url && (
                  <img
                    src={formData.banner_image_url}
                    alt="Banner preview"
                    className="w-32 h-20 object-cover rounded"
                  />
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Start Date *</label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">End Date *</label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Minimum 30 days from start
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePromotion}>
              {editingPromotion ? 'Update' : 'Create'} Promotion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Promotion?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the promotion.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePromotion}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
