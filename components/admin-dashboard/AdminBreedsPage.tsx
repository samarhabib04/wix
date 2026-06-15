'use client';

import { useState, useEffect, useMemo, useCallback } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { Search, Plus, Edit, Trash2, Save, X, Image as ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { ImageUploader } from "@/components/ui/image-uploader";
import TruncatedCellText from "@/components/admin-dashboard/TruncatedCellText";

interface Breed {
  id: string;
  breed: string;
  breed_type: string | null;
  description: string | null;
  image_url: string | null;
  size: string | null;
  energy: string | null;
  grooming: string | null;
  life_expectancy: string | null;
  beginner_friendly: string | null;
  temperament: any;
  special_considerations: any;
}

const BREED_TYPES = ['Pedigree', 'Mixed Breed'];
const SIZES = ['Small', 'Medium', 'Large', 'Extra Large'];
const ENERGY_LEVELS = ['Low', 'Moderate', 'High', 'Very High'];
const GROOMING_NEEDS = ['Low', 'Moderate', 'High', 'Very High'];
const BEGINNER_FRIENDLY_OPTIONS = ['Yes', 'No', 'With Training'];

export default function AdminBreedsPage() {
  const { toast } = useToast();
  const [breeds, setBreeds] = useState<Breed[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingBreed, setEditingBreed] = useState<Breed | null>(null);
  const [deleteBreed, setDeleteBreed] = useState<Breed | null>(null);
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  const [formData, setFormData] = useState<Partial<Breed>>({
    breed: '',
    breed_type: 'Pedigree',
    description: '',
    image_url: '',
    size: '',
    energy: '',
    grooming: '',
    life_expectancy: '',
    beginner_friendly: '',
    temperament: null,
    special_considerations: null,
  });

  const fetchBreeds = useCallback(async (page: number = 1, search?: string) => {
    try {
      setIsLoading(true);
      const startIndex = (page - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage - 1;
      
      // Build query with optional search
      let query = supabase
        .from('quiz_breeds')
        .select('*', { count: 'exact' })
        .order('breed', { ascending: true });
      
      // Apply server-side search if provided
      if (search && search.trim()) {
        query = query.or(`breed.ilike.%${search.trim()}%,breed_type.ilike.%${search.trim()}%`);
      }
      
      // Apply pagination range
      query = query.range(startIndex, endIndex);
      
      const { data, error, count } = await query;

      if (error) throw error;
      
      setBreeds(data || []);
      setTotalCount(count || 0);
    } catch (error: any) {
      console.error('Error fetching breeds:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to fetch breeds"
      });
    } finally {
      setIsLoading(false);
    }
  }, [itemsPerPage, toast]);

  const handleOpenDialog = (breed?: Breed) => {
    if (breed) {
      setEditingBreed(breed);
      setFormData({
        breed: breed.breed || '',
        breed_type: breed.breed_type || 'Pedigree',
        description: breed.description || '',
        image_url: breed.image_url || '',
        size: breed.size || '',
        energy: breed.energy || '',
        grooming: breed.grooming || '',
        life_expectancy: breed.life_expectancy || '',
        beginner_friendly: breed.beginner_friendly || '',
        temperament: breed.temperament || null,
        special_considerations: breed.special_considerations || null,
      });
    } else {
      setEditingBreed(null);
      setFormData({
        breed: '',
        breed_type: 'Pedigree',
        description: '',
        image_url: '',
        size: '',
        energy: '',
        grooming: '',
        life_expectancy: '',
        beginner_friendly: '',
        temperament: null,
        special_considerations: null,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingBreed(null);
    setFormData({
      breed: '',
      breed_type: 'Pedigree',
      description: '',
      image_url: '',
      size: '',
      energy: '',
      grooming: '',
      life_expectancy: '',
      beginner_friendly: '',
      temperament: null,
      special_considerations: null,
    });
  };

  const handleSave = async () => {
    if (!formData.breed?.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Breed name is required"
      });
      return;
    }

    try {
      setSaving(true);

      if (editingBreed) {
        // Update existing breed
        const { error } = await supabase
          .from('quiz_breeds')
          .update({
            breed: formData.breed,
            breed_type: formData.breed_type,
            description: formData.description || null,
            image_url: formData.image_url || null,
            size: formData.size || null,
            energy: formData.energy || null,
            grooming: formData.grooming || null,
            life_expectancy: formData.life_expectancy || null,
            beginner_friendly: formData.beginner_friendly || null,
            temperament: formData.temperament || null,
            special_considerations: formData.special_considerations || null,
          })
          .eq('id', editingBreed.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Breed updated successfully"
        });
      } else {
        // Create new breed
        const { error } = await supabase
          .from('quiz_breeds')
          .insert({
            breed: formData.breed,
            breed_type: formData.breed_type,
            description: formData.description || null,
            image_url: formData.image_url || null,
            size: formData.size || null,
            energy: formData.energy || null,
            grooming: formData.grooming || null,
            life_expectancy: formData.life_expectancy || null,
            beginner_friendly: formData.beginner_friendly || null,
            temperament: formData.temperament || null,
            special_considerations: formData.special_considerations || null,
          });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Breed created successfully"
        });
      }

      handleCloseDialog();
      await fetchBreeds(currentPage, searchTerm);
    } catch (error: any) {
      console.error('Error saving breed:', error);
      
      // Check for RLS policy violation (permission denied)
      let errorMessage = error.message || "Failed to save breed";
      if (error.code === '42501' || error.message?.includes('permission denied') || error.message?.includes('policy')) {
        errorMessage = "You don't have permission to add or edit breeds. Admin access required.";
      }
      
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteBreed) return;

    try {
      const { error } = await supabase
        .from('quiz_breeds')
        .delete()
        .eq('id', deleteBreed.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Breed deleted successfully"
      });

      setIsDeleteDialogOpen(false);
      setDeleteBreed(null);
      await fetchBreeds(currentPage, searchTerm);
    } catch (error: any) {
      console.error('Error deleting breed:', error);
      
      // Check for RLS policy violation (permission denied)
      let errorMessage = error.message || "Failed to delete breed";
      if (error.code === '42501' || error.message?.includes('permission denied') || error.message?.includes('policy')) {
        errorMessage = "You don't have permission to delete breeds. Admin access required.";
      }
      
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage
      });
    }
  };

  // Debounce search term to avoid fetching on every keystroke
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Reset to page 1 when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  // Fetch breeds when page or debounced search term changes
  useEffect(() => {
    fetchBreeds(currentPage, debouncedSearchTerm);
  }, [currentPage, debouncedSearchTerm, fetchBreeds]);

  // Calculate pagination using totalCount from server
  const totalPages = useMemo(() => {
    if (isLoading || totalCount === 0) return 0;
    return Math.ceil(totalCount / itemsPerPage);
  }, [totalCount, itemsPerPage, isLoading]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalCount);
  const paginatedBreeds = breeds; // Breeds are already paginated from server
  
  // Ensure currentPage doesn't exceed totalPages (e.g., when breeds are deleted)
  useEffect(() => {
    if (!isLoading && totalCount > 0) {
      if (totalPages > 0 && currentPage > totalPages) {
        setCurrentPage(totalPages);
      } else if (totalPages === 0 && currentPage !== 1) {
        setCurrentPage(1);
      }
    }
  }, [totalPages, currentPage, isLoading, totalCount]);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6 px-4">
        <div className="text-center py-12">Loading breeds...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6 px-4 bg-white">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Breeds Management</h1>
          <p className="text-gray-600 mt-1">Manage dog breeds displayed on the /breeds page</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Breed
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search breeds..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table className="table-fixed min-w-[780px]">
          <TableHeader>
            <TableRow>
              <TableHead>Breed</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Energy</TableHead>
              <TableHead>Grooming</TableHead>
              <TableHead>Image</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedBreeds.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  No breeds found
                </TableCell>
              </TableRow>
            ) : (
              paginatedBreeds.map((breed) => (
                <TableRow key={breed.id}>
                  <TableCell className="font-medium"><TruncatedCellText text={breed.breed} maxChars={24} className="max-w-[180px]" /></TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {breed.breed_type || 'N/A'}
                    </Badge>
                  </TableCell>
                  <TableCell><TruncatedCellText text={breed.size || 'N/A'} maxChars={14} className="max-w-[100px]" /></TableCell>
                  <TableCell><TruncatedCellText text={breed.energy || 'N/A'} maxChars={14} className="max-w-[100px]" /></TableCell>
                  <TableCell><TruncatedCellText text={breed.grooming || 'N/A'} maxChars={14} className="max-w-[100px]" /></TableCell>
                  <TableCell>
                    {breed.image_url ? (
                      <div className="relative w-16 h-16 rounded overflow-hidden">
                        <Image
                          src={breed.image_url}
                          alt={breed.breed}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">No image</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(breed)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDeleteBreed(breed);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {!isLoading && totalCount > itemsPerPage && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1} to {Math.min(endIndex, totalCount)} of {totalCount} breeds
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage >= totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBreed ? 'Edit Breed' : 'Add New Breed'}</DialogTitle>
            <DialogDescription>
              {editingBreed ? 'Update breed information' : 'Add a new breed to the database'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="breed">Breed Name *</Label>
                <Input
                  id="breed"
                  value={formData.breed}
                  onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                  placeholder="e.g., Golden Retriever"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="breed_type">Breed Type *</Label>
                <Select
                  value={formData.breed_type || 'Pedigree'}
                  onValueChange={(value) => setFormData({ ...formData, breed_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BREED_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Breed description..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="image_url">Breed Image</Label>
              <ImageUploader
                value={formData.image_url || null}
                onChange={(url) => setFormData({ ...formData, image_url: url || '' })}
                bucketName="breed-images"
                required={false}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="size">Size</Label>
                <Select
                  value={formData.size || ''}
                  onValueChange={(value) => setFormData({ ...formData, size: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    {SIZES.map((size) => (
                      <SelectItem key={size} value={size}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="energy">Energy Level</Label>
                <Select
                  value={formData.energy || ''}
                  onValueChange={(value) => setFormData({ ...formData, energy: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select energy level" />
                  </SelectTrigger>
                  <SelectContent>
                    {ENERGY_LEVELS.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="grooming">Grooming Needs</Label>
                <Select
                  value={formData.grooming || ''}
                  onValueChange={(value) => setFormData({ ...formData, grooming: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select grooming needs" />
                  </SelectTrigger>
                  <SelectContent>
                    {GROOMING_NEEDS.map((need) => (
                      <SelectItem key={need} value={need}>
                        {need}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="life_expectancy">Life Expectancy</Label>
                <Input
                  id="life_expectancy"
                  value={formData.life_expectancy || ''}
                  onChange={(e) => setFormData({ ...formData, life_expectancy: e.target.value })}
                  placeholder="e.g., 10-12 years"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="beginner_friendly">Beginner Friendly</Label>
              <Select
                value={formData.beginner_friendly || ''}
                onValueChange={(value) => setFormData({ ...formData, beginner_friendly: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select option" />
                </SelectTrigger>
                <SelectContent>
                  {BEGINNER_FRIENDLY_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} disabled={saving}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : editingBreed ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the breed "{deleteBreed?.breed}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

