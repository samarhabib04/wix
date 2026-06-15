import { useState, useEffect } from "react";
import { ChevronUp, ChevronDown, Image as ImageIcon, X, CalendarIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Updated interface to include DOB
export interface FamilyTreeMember {
  id: string;
  name: string;
  breed?: string;
  dateOfBirth?: Date;
  image?: File | string;
  relationship: string;
  linkToListing?: string;
}

interface FamilyTreeInputProps {
  familyTree: FamilyTreeMember[] | null | undefined;
  onChange: (updatedTree: FamilyTreeMember[]) => void;
}

export const FamilyTreeInput = ({ familyTree, onChange }: FamilyTreeInputProps) => {
  const [showGrandparents, setShowGrandparents] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [breedOptions, setBreedOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [calendarOpen, setCalendarOpen] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  // Ensure familyTree is always an array
  const safeFamilyTree = familyTree || [];

  // Fetch breeds from quiz_breeds table
  useEffect(() => {
    const fetchBreeds = async () => {
      try {
        const { data, error } = await supabase
          .from('quiz_breeds')
          .select('breed')
          .order('breed');
        
        if (error) {
          console.error('Error fetching breeds:', error);
          toast({
            title: "Error loading breeds",
            description: "Could not load breed options. Please try again.",
            variant: "destructive",
          });
          return;
        }
        
        const formattedBreeds = data.map(item => ({
          value: item.breed.toLowerCase().replace(/\s+/g, ''),
          label: item.breed
        }));
        
        setBreedOptions(formattedBreeds);
      } catch (error) {
        console.error('Error fetching breeds:', error);
        toast({
          title: "Error loading breeds",
          description: "Could not load breed options. Please try again.",
          variant: "destructive",
        });
      }
    };
    
    fetchBreeds();
  }, [toast]);

  const handleParentChange = (
    parent: "mother" | "father",
    field: "name" | "breed" | "dateOfBirth",
    newValue: string | Date
  ) => {
    const updatedTree = [...safeFamilyTree];
    const parentIndex = updatedTree.findIndex(item => item.relationship === parent);
    
    if (parentIndex >= 0) {
      updatedTree[parentIndex] = {
        ...updatedTree[parentIndex],
        [field]: newValue,
      };
    } else {
      // Create new parent entry
      const newParent: FamilyTreeMember = {
        id: Date.now().toString() + Math.random().toString(36).substring(2),
        name: field === "name" ? newValue as string : "",
        breed: field === "breed" ? newValue as string : "",
        dateOfBirth: field === "dateOfBirth" ? newValue as Date : undefined,
        relationship: parent,
      };
      updatedTree.push(newParent);
    }
    
    onChange(updatedTree);
  };

  const handleParentImageChange = (
    parent: "mother" | "father",
    file: File | undefined
  ) => {
    if (file) {
      // Create or update preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrls(prev => ({
        ...prev,
        [parent]: url
      }));

      const updatedTree = [...safeFamilyTree];
      const parentIndex = updatedTree.findIndex(item => item.relationship === parent);
      
      if (parentIndex >= 0) {
        updatedTree[parentIndex] = {
          ...updatedTree[parentIndex],
          image: file,
        };
      } else {
        // Create new parent entry with image
        const newParent: FamilyTreeMember = {
          id: Date.now().toString() + Math.random().toString(36).substring(2),
          name: "",
          breed: "",
          image: file,
          relationship: parent,
        };
        updatedTree.push(newParent);
      }
      
      onChange(updatedTree);
    }
  };

  const handleGrandparentChange = (
    position: string,
    field: "name" | "breed" | "dateOfBirth",
    newValue: string | Date
  ) => {
    const updatedTree = [...safeFamilyTree];
    const grandparentIndex = updatedTree.findIndex(item => item.relationship === position);
    
    if (grandparentIndex >= 0) {
      updatedTree[grandparentIndex] = {
        ...updatedTree[grandparentIndex],
        [field]: newValue,
      };
    } else {
      // Create new grandparent entry
      const newGrandparent: FamilyTreeMember = {
        id: Date.now().toString() + Math.random().toString(36).substring(2),
        name: field === "name" ? newValue as string : "",
        breed: field === "breed" ? newValue as string : "",
        dateOfBirth: field === "dateOfBirth" ? newValue as Date : undefined,
        relationship: position,
      };
      updatedTree.push(newGrandparent);
    }
    
    onChange(updatedTree);
  };

  const handleGrandparentImageChange = (position: string, file: File | undefined) => {
    if (file) {
      // Create or update preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrls(prev => ({
        ...prev,
        [position]: url
      }));

      const updatedTree = [...safeFamilyTree];
      const grandparentIndex = updatedTree.findIndex(item => item.relationship === position);
      
      if (grandparentIndex >= 0) {
        updatedTree[grandparentIndex] = {
          ...updatedTree[grandparentIndex],
          image: file,
        };
      } else {
        // Create new grandparent entry with image
        const newGrandparent: FamilyTreeMember = {
          id: Date.now().toString() + Math.random().toString(36).substring(2),
          name: "",
          breed: "",
          image: file,
          relationship: position,
        };
        updatedTree.push(newGrandparent);
      }
      
      onChange(updatedTree);
    }
  };

  const addGrandparents = () => {
    setShowGrandparents(true);
  };

  const removeImage = (key: string) => {
    // Revoke the URL to prevent memory leaks
    if (previewUrls[key]) {
      URL.revokeObjectURL(previewUrls[key]);
      const updatedPreviewUrls = { ...previewUrls };
      delete updatedPreviewUrls[key];
      setPreviewUrls(updatedPreviewUrls);
    }

    // Remove the image from the appropriate family member
    const updatedTree = [...safeFamilyTree];
    const memberIndex = updatedTree.findIndex(item => item.relationship === key);
    
    if (memberIndex >= 0) {
      updatedTree[memberIndex] = {
        ...updatedTree[memberIndex],
        image: undefined,
      };
      
      onChange(updatedTree);
    }
  };

  // Helper function to toggle calendar open state
  const toggleCalendar = (key: string, isOpen: boolean) => {
    setCalendarOpen(prev => ({
      ...prev,
      [key]: isOpen
    }));
  };

  // Helper function to get member by relationship
  const getMember = (relationship: string) => {
    return safeFamilyTree.find(item => item.relationship === relationship) || { 
      id: "", 
      name: "", 
      breed: "", 
      relationship 
    };
  };

  const mother = getMember("mother");
  const father = getMember("father");
  const maternalGrandmother = getMember("maternal-grandmother");
  const maternalGrandfather = getMember("maternal-grandfather");
  const paternalGrandmother = getMember("paternal-grandmother");
  const paternalGrandfather = getMember("paternal-grandfather");

  return (
    <div className="space-y-6">
      {/* Mother Section */}
      <div className="space-y-4">
        <h3 className="font-medium text-lg">Mother</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="mother-name">Name</Label>
            <Input
              id="mother-name"
              value={mother.name || ""}
              onChange={(e) => handleParentChange("mother", "name", e.target.value)}
              placeholder="Mother's name"
            />
          </div>
          
          <div>
            <Label htmlFor="mother-breed">Breed</Label>
            <Select
              value={mother.breed || ""}
              onValueChange={(value) => handleParentChange("mother", "breed", value)}
            >
              <SelectTrigger id="mother-breed">
                <SelectValue placeholder="Select breed" />
              </SelectTrigger>
              <SelectContent>
                {breedOptions.map((breed) => (
                  <SelectItem key={breed.value} value={breed.value}>
                    {breed.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Date of Birth</Label>
            <Popover open={calendarOpen["mother"] || false} onOpenChange={(open) => toggleCalendar("mother", open)}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !mother.dateOfBirth && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {mother.dateOfBirth ? format(mother.dateOfBirth, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={mother.dateOfBirth}
                  onSelect={(date) => {
                    if (date) {
                      handleParentChange("mother", "dateOfBirth", date);
                      setTimeout(() => toggleCalendar("mother", false), 100);
                    }
                  }}
                  disabled={(date) => date > new Date()}
                  initialFocus
                  captionLayout="dropdown"
                  fromYear={1990}
                  toYear={new Date().getFullYear()}
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div>
            <Label>Image (Optional)</Label>
            {previewUrls["mother"] ? (
              <div className="relative h-20 w-20 rounded-md overflow-hidden">
                <img
                  src={previewUrls["mother"]}
                  alt="Mother"
                  className="h-full w-full object-cover "
                />
                <button
                  type="button"
                  onClick={() => removeImage("mother")}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center h-20 w-20 border-2 border-dashed border-gray-300 rounded-md cursor-pointer bg-white hover:bg-gray-50">
                <div className="space-y-1 text-center">
                  <ImageIcon className="mx-auto h-8 w-8 text-gray-400" />
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleParentImageChange("mother", e.target.files[0]);
                    }
                  }}
                />
              </label>
            )}
          </div>
        </div>
      </div>

      {/* Father Section */}
      <div className="space-y-4">
        <h3 className="font-medium text-lg">Father</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="father-name">Name</Label>
            <Input
              id="father-name"
              value={father.name || ""}
              onChange={(e) => handleParentChange("father", "name", e.target.value)}
              placeholder="Father's name"
            />
          </div>
          
          <div>
            <Label htmlFor="father-breed">Breed</Label>
            <Select
              value={father.breed || ""}
              onValueChange={(value) => handleParentChange("father", "breed", value)}
            >
              <SelectTrigger id="father-breed">
                <SelectValue placeholder="Select breed" />
              </SelectTrigger>
              <SelectContent>
                {breedOptions.map((breed) => (
                  <SelectItem key={breed.value} value={breed.value}>
                    {breed.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Date of Birth</Label>
            <Popover open={calendarOpen["father"] || false} onOpenChange={(open) => toggleCalendar("father", open)}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !father.dateOfBirth && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {father.dateOfBirth ? format(father.dateOfBirth, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={father.dateOfBirth}
                  onSelect={(date) => {
                    if (date) {
                      handleParentChange("father", "dateOfBirth", date);
                      setTimeout(() => toggleCalendar("father", false), 100);
                    }
                  }}
                  disabled={(date) => date > new Date()}
                  initialFocus
                  captionLayout="dropdown"
                  fromYear={1990}
                  toYear={new Date().getFullYear()}
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div>
            <Label>Image (Optional)</Label>
            {previewUrls["father"] ? (
              <div className="relative h-20 w-20 rounded-md overflow-hidden">
                <img
                  src={previewUrls["father"]}
                  alt="Father"
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeImage("father")}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center h-20 w-20 border-2 border-dashed border-gray-300 rounded-md cursor-pointer bg-white hover:bg-gray-50">
                <div className="space-y-1 text-center">
                  <ImageIcon className="mx-auto h-8 w-8 text-gray-400" />
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleParentImageChange("father", e.target.files[0]);
                    }
                  }}
                />
              </label>
            )}
          </div>
        </div>
      </div>

      {/* Grandparents Section */}
      {!showGrandparents ? (
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={addGrandparents}
        >
          + Add Grandparents
        </Button>
      ) : (
        <Collapsible open={true} className="mt-6 space-y-4">
          <CollapsibleTrigger asChild>
            <div className="flex justify-between items-center cursor-pointer">
              <h3 className="font-medium text-lg">Grandparents (Optional)</h3>
              <ChevronUp className="h-4 w-4" />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-8">
              {/* Maternal Grandparents */}
              <div className="space-y-4">
                <h4 className="font-medium text-md text-gray-600">Maternal (Mother's Side)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Maternal Grandmother */}
                  <div className="space-y-4 border p-4 rounded-md">
                    <h5 className="text-sm font-medium">Grandmother</h5>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="mat-grandmother-name">Name</Label>
                        <Input
                          id="mat-grandmother-name"
                          value={maternalGrandmother.name || ""}
                          onChange={(e) => handleGrandparentChange("maternal-grandmother", "name", e.target.value)}
                          placeholder="Grandmother's name"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="mat-grandmother-breed">Breed</Label>
                        <Select
                          value={maternalGrandmother.breed || ""}
                          onValueChange={(value) => handleGrandparentChange("maternal-grandmother", "breed", value)}
                        >
                          <SelectTrigger id="mat-grandmother-breed">
                            <SelectValue placeholder="Select breed" />
                          </SelectTrigger>
                          <SelectContent>
                            {breedOptions.map((breed) => (
                              <SelectItem key={breed.value} value={breed.value}>
                                {breed.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Date of Birth</Label>
                        <Popover open={calendarOpen["maternal-grandmother"] || false} onOpenChange={(open) => toggleCalendar("maternal-grandmother", open)}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !maternalGrandmother.dateOfBirth && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {maternalGrandmother.dateOfBirth ? format(maternalGrandmother.dateOfBirth, "PPP") : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={maternalGrandmother.dateOfBirth}
                              onSelect={(date) => {
                                if (date) {
                                  handleGrandparentChange("maternal-grandmother", "dateOfBirth", date);
                                  setTimeout(() => toggleCalendar("maternal-grandmother", false), 100);
                                }
                              }}
                              disabled={(date) => date > new Date()}
                              initialFocus
                              captionLayout="dropdown"
                              fromYear={1990}
                              toYear={new Date().getFullYear()}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      
                      <div>
                        <Label>Image (Optional)</Label>
                        <div className="mt-1">
                          {previewUrls["maternal-grandmother"] ? (
                            <div className="relative h-16 w-16 rounded-md overflow-hidden">
                              <img
                                src={previewUrls["maternal-grandmother"]}
                                alt="Maternal grandmother"
                                className="h-full w-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => removeImage("maternal-grandmother")}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <label className="flex items-center justify-center h-16 w-16 border-2 border-dashed border-gray-300 rounded-md cursor-pointer bg-white hover:bg-gray-50">
                              <div className="space-y-1 text-center">
                                <ImageIcon className="mx-auto h-6 w-6 text-gray-400" />
                              </div>
                              <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={(e) => {
                                  if (e.target.files?.[0]) {
                                    handleGrandparentImageChange("maternal-grandmother", e.target.files[0]);
                                  }
                                }}
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Maternal Grandfather */}
                  <div className="space-y-4 border p-4 rounded-md">
                    <h5 className="text-sm font-medium">Grandfather</h5>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="mat-grandfather-name">Name</Label>
                        <Input
                          id="mat-grandfather-name"
                          value={maternalGrandfather.name || ""}
                          onChange={(e) => handleGrandparentChange("maternal-grandfather", "name", e.target.value)}
                          placeholder="Grandfather's name"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="mat-grandfather-breed">Breed</Label>
                        <Select
                          value={maternalGrandfather.breed || ""}
                          onValueChange={(value) => handleGrandparentChange("maternal-grandfather", "breed", value)}
                        >
                          <SelectTrigger id="mat-grandfather-breed">
                            <SelectValue placeholder="Select breed" />
                          </SelectTrigger>
                          <SelectContent>
                            {breedOptions.map((breed) => (
                              <SelectItem key={breed.value} value={breed.value}>
                                {breed.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Date of Birth</Label>
                        <Popover open={calendarOpen["maternal-grandfather"] || false} onOpenChange={(open) => toggleCalendar("maternal-grandfather", open)}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !maternalGrandfather.dateOfBirth && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {maternalGrandfather.dateOfBirth ? format(maternalGrandfather.dateOfBirth, "PPP") : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={maternalGrandfather.dateOfBirth}
                              onSelect={(date) => {
                                if (date) {
                                  handleGrandparentChange("maternal-grandfather", "dateOfBirth", date);
                                  setTimeout(() => toggleCalendar("maternal-grandfather", false), 100);
                                }
                              }}
                              disabled={(date) => date > new Date()}
                              initialFocus
                              captionLayout="dropdown"
                              fromYear={1990}
                              toYear={new Date().getFullYear()}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      
                      <div>
                        <Label>Image (Optional)</Label>
                        <div className="mt-1">
                          {previewUrls["maternal-grandfather"] ? (
                            <div className="relative h-16 w-16 rounded-md overflow-hidden">
                              <img
                                src={previewUrls["maternal-grandfather"]}
                                alt="Maternal grandfather"
                                className="h-full w-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => removeImage("maternal-grandfather")}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <label className="flex items-center justify-center h-16 w-16 border-2 border-dashed border-gray-300 rounded-md cursor-pointer bg-white hover:bg-gray-50">
                              <div className="space-y-1 text-center">
                                <ImageIcon className="mx-auto h-6 w-6 text-gray-400" />
                              </div>
                              <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={(e) => {
                                  if (e.target.files?.[0]) {
                                    handleGrandparentImageChange("maternal-grandfather", e.target.files[0]);
                                  }
                                }}
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Paternal Grandparents */}
              <div className="space-y-4">
                <h4 className="font-medium text-md text-gray-600">Paternal (Father's Side)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Paternal Grandmother */}
                  <div className="space-y-4 border p-4 rounded-md">
                    <h5 className="text-sm font-medium">Grandmother</h5>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="pat-grandmother-name">Name</Label>
                        <Input
                          id="pat-grandmother-name"
                          value={paternalGrandmother.name || ""}
                          onChange={(e) => handleGrandparentChange("paternal-grandmother", "name", e.target.value)}
                          placeholder="Grandmother's name"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="pat-grandmother-breed">Breed</Label>
                        <Select
                          value={paternalGrandmother.breed || ""}
                          onValueChange={(value) => handleGrandparentChange("paternal-grandmother", "breed", value)}
                        >
                          <SelectTrigger id="pat-grandmother-breed">
                            <SelectValue placeholder="Select breed" />
                          </SelectTrigger>
                          <SelectContent>
                            {breedOptions.map((breed) => (
                              <SelectItem key={breed.value} value={breed.value}>
                                {breed.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Date of Birth</Label>
                        <Popover open={calendarOpen["paternal-grandmother"] || false} onOpenChange={(open) => toggleCalendar("paternal-grandmother", open)}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !paternalGrandmother.dateOfBirth && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {paternalGrandmother.dateOfBirth ? format(paternalGrandmother.dateOfBirth, "PPP") : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={paternalGrandmother.dateOfBirth}
                              onSelect={(date) => {
                                if (date) {
                                  handleGrandparentChange("paternal-grandmother", "dateOfBirth", date);
                                  setTimeout(() => toggleCalendar("paternal-grandmother", false), 100);
                                }
                              }}
                              disabled={(date) => date > new Date()}
                              initialFocus
                              captionLayout="dropdown"
                              fromYear={1990}
                              toYear={new Date().getFullYear()}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      
                      <div>
                        <Label>Image (Optional)</Label>
                        <div className="mt-1">
                          {previewUrls["paternal-grandmother"] ? (
                            <div className="relative h-16 w-16 rounded-md overflow-hidden">
                              <img
                                src={previewUrls["paternal-grandmother"]}
                                alt="Paternal grandmother"
                                className="h-full w-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => removeImage("paternal-grandmother")}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <label className="flex items-center justify-center h-16 w-16 border-2 border-dashed border-gray-300 rounded-md cursor-pointer bg-white hover:bg-gray-50">
                              <div className="space-y-1 text-center">
                                <ImageIcon className="mx-auto h-6 w-6 text-gray-400" />
                              </div>
                              <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={(e) => {
                                  if (e.target.files?.[0]) {
                                    handleGrandparentImageChange("paternal-grandmother", e.target.files[0]);
                                  }
                                }}
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Paternal Grandfather */}
                  <div className="space-y-4 border p-4 rounded-md">
                    <h5 className="text-sm font-medium">Grandfather</h5>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="pat-grandfather-name">Name</Label>
                        <Input
                          id="pat-grandfather-name"
                          value={paternalGrandfather.name || ""}
                          onChange={(e) => handleGrandparentChange("paternal-grandfather", "name", e.target.value)}
                          placeholder="Grandfather's name"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="pat-grandfather-breed">Breed</Label>
                        <Select
                          value={paternalGrandfather.breed || ""}
                          onValueChange={(value) => handleGrandparentChange("paternal-grandfather", "breed", value)}
                        >
                          <SelectTrigger id="pat-grandfather-breed">
                            <SelectValue placeholder="Select breed" />
                          </SelectTrigger>
                          <SelectContent>
                            {breedOptions.map((breed) => (
                              <SelectItem key={breed.value} value={breed.value}>
                                {breed.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Date of Birth</Label>
                        <Popover open={calendarOpen["paternal-grandfather"] || false} onOpenChange={(open) => toggleCalendar("paternal-grandfather", open)}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !paternalGrandfather.dateOfBirth && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {paternalGrandfather.dateOfBirth ? format(paternalGrandfather.dateOfBirth, "PPP") : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={paternalGrandfather.dateOfBirth}
                              onSelect={(date) => {
                                if (date) {
                                  handleGrandparentChange("paternal-grandfather", "dateOfBirth", date);
                                  setTimeout(() => toggleCalendar("paternal-grandfather", false), 100);
                                }
                              }}
                              disabled={(date) => date > new Date()}
                              initialFocus
                              captionLayout="dropdown"
                              fromYear={1990}
                              toYear={new Date().getFullYear()}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      
                      <div>
                        <Label>Image (Optional)</Label>
                        <div className="mt-1">
                          {previewUrls["paternal-grandfather"] ? (
                            <div className="relative h-16 w-16 rounded-md overflow-hidden">
                              <img
                                src={previewUrls["paternal-grandfather"]}
                                alt="Paternal grandfather"
                                className="h-full w-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => removeImage("paternal-grandfather")}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <label className="flex items-center justify-center h-16 w-16 border-2 border-dashed border-gray-300 rounded-md cursor-pointer bg-white hover:bg-gray-50">
                              <div className="space-y-1 text-center">
                                <ImageIcon className="mx-auto h-6 w-6 text-gray-400" />
                              </div>
                              <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={(e) => {
                                  if (e.target.files?.[0]) {
                                    handleGrandparentImageChange("paternal-grandfather", e.target.files[0]);
                                  }
                                }}
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};
