

import React, { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HealthLabel } from './HealthLabel';
import { ImageUploader } from './ImageUploader';
import { HealthCodeInput } from './HealthCodeInput';
import { DocumentUploader, UploadedDocument } from './DocumentUploader';
import { Plus, Trash2, Info } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface PuppyDetails {
  id: string;
  microchipNumber: string;
  v1Code: string;
  v2Code: string;
  h1Code: string;
  sex: 'male' | 'female' | '';
  color: string;
  colourCollar: string;
  price: string;
  imageUrl: string | null;
  folder?: string; // Add folder property to interface
  documents?: UploadedDocument[]; // Optional documents for each puppy
}

interface PuppyMicrochipDetailsProps {
  puppies: PuppyDetails[];
  onPuppiesChange: (puppies: PuppyDetails[] | ((current: PuppyDetails[]) => PuppyDetails[])) => void;
  listingId?: string;
  /** When editing, pass DB listing id so same ad can keep its locked codes */
  excludeListingId?: string;
  showValidationErrors?: boolean;
  validationKey?: number;
  pricingOption?: string;
}

// Collar color options
const collarColorOptions = [
  { value: 'green', label: 'Green' },
  { value: 'light-blue', label: 'Light Blue' },
  { value: 'dark-blue', label: 'Dark Blue' },
  { value: 'purple', label: 'Purple' },
  { value: 'red', label: 'Red' },
  { value: 'gold', label: 'Gold' },
  { value: 'yellow', label: 'Yellow' },
  { value: 'black', label: 'Black' },
  { value: 'brown', label: 'Brown' },
  { value: 'orange', label: 'Orange' },
  { value: 'dark-grey', label: 'Dark Grey' },
  { value: 'grey', label: 'Grey' },
  { value: 'other', label: 'OTHER' },
];

const PuppyMicrochipDetails: React.FC<PuppyMicrochipDetailsProps> = ({
  puppies,
  onPuppiesChange,
  listingId,
  excludeListingId,
  showValidationErrors = false,
  validationKey = 0,
  pricingOption = 'individual'
}) => {
  const addPuppy = () => {
    const newPuppy: PuppyDetails = {
      id: uuidv4(),
      microchipNumber: '',
      v1Code: '',
      v2Code: '',
      h1Code: '',
      sex: '',
      color: '',
      colourCollar: '',
      price: '',
      imageUrl: null,
      documents: []
    };
    onPuppiesChange([...puppies, newPuppy]);
  };

  const removePuppy = (id: string) => {
    onPuppiesChange(puppies.filter(puppy => puppy.id !== id));
  };

  const updatePuppy = (id: string, field: keyof PuppyDetails, value: string | null) => {
    onPuppiesChange(
      puppies.map(puppy =>
        puppy.id === id ? { ...puppy, [field]: value } : puppy
      )
    );
  };

  // Handler specifically for image updates to ensure proper state management
  const handleImageUpdate = (puppyId: string, urls: string[]) => {

    const newImageUrl = urls.length > 0 ? urls[0] : null;

    updatePuppy(puppyId, 'imageUrl', newImageUrl);
  };

  // Handler for puppy documents - memoized to ensure stable reference
  const handlePuppyDocumentsChange = useCallback((puppyId: string, documents: UploadedDocument[]) => {
    onPuppiesChange((currentPuppies) =>
      currentPuppies.map(puppy =>
        puppy.id === puppyId ? { ...puppy, documents } : puppy
      )
    );
  }, [onPuppiesChange]);

  // Improved validation function for different field types

  const hasValidationError = (field: keyof PuppyDetails, value: string | null) => {
    if (!showValidationErrors) return false;

    switch (field) {
      case 'microchipNumber':
        return !value || value.length !== 15 || !/^\d{15}$/.test(value);
      case 'price':
        return !value || isNaN(Number(value));
      default:
        return !value || value.trim() === '';
    }
  };

  // Determine total counts for the header
  const maleCount = puppies.filter(p => p.sex === 'male').length;
  const femaleCount = puppies.filter(p => p.sex === 'female').length;

  // Helper to copy details from previous puppy
  const copyFromPrevious = (currentIndex: number) => {
    if (currentIndex <= 0) return;

    // Find the previous puppy OF THE SAME SEX if possible, or just the immediate previous
    // Actually simpler: just copy immediate previous since they are grouped by sex
    const sourcePuppy = puppies[currentIndex - 1];
    const targetPuppy = puppies[currentIndex];

    if (!sourcePuppy) return;

    const updatedPuppies = [...puppies];
    updatedPuppies[currentIndex] = {
      ...sourcePuppy,
      id: targetPuppy.id, // Preserve ID
      sex: targetPuppy.sex, // Preserve Sex
      // Clear optional fields that should likely be unique
      microchipNumber: '',
      imageUrl: null
    };

    onPuppiesChange(updatedPuppies);
  };

  return (
    <div key={validationKey} className="space-y-4">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <Label className="text-base font-medium">Individual Puppy Details (Required)</Label>
            <p className="text-sm text-gray-500 mt-1">
              Please provide details for all {maleCount + femaleCount} puppies ({maleCount} Male, {femaleCount} Female).
              <span className="block mt-1 text-xs text-blue-600">
                Puppies are automatically added based on your counts above.
              </span>
            </p>
          </div>
        </div>

        {puppies.length === 0 && (
          <div className="p-8 text-center border-2 border-dashed rounded-lg bg-gray-50">
            <p className="text-gray-500">
              Set the number of Male and Female puppies above to add details.
            </p>
          </div>
        )}

        {puppies.map((puppy, index) => {
          // Group logic: check if sex changes from previous
          const isFirstOfSex = index === 0 || puppies[index - 1].sex !== puppy.sex;

          return (
            <React.Fragment key={puppy.id}>
              {isFirstOfSex && (
                <div className="mt-6 mb-2 pb-2 border-b border-gray-200">
                  <h4 className="font-berkshire text-xl text-gray-700 capitalize">
                    {puppy.sex} Puppies
                  </h4>
                </div>
              )}

              <div className="border rounded-lg p-4 space-y-4 bg-white shadow-sm relative">
                <div className="flex justify-between items-center">
                  <h4 className="font-berkshire text-2xl text-brand-soft-green">
                    {puppy.sex === 'male' ? '💙' : '💗'} {puppy.sex ? (puppy.sex.charAt(0).toUpperCase() + puppy.sex.slice(1)) : 'Puppy'} #{index + 1}
                  </h4>

                  {index > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => copyFromPrevious(index)}
                      className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 ml-auto"
                      title="Copy details (color, price, etc.) from the puppy above"
                    >
                      📋 Copy from above
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor={`sex-${puppy.id}`} className="text-gray-500">Sex</Label>
                    <div className="mt-1 p-2 bg-gray-100 rounded border text-gray-700 font-medium capitalize">
                      {puppy.sex || 'Not set'}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Determined by counts above</p>
                  </div>

                  <div>
                    <Label htmlFor={`color-${puppy.id}`}>Colour (Optional)</Label>
                    <Input
                      id={`color-${puppy.id}`}
                      value={puppy.color}
                      onChange={(e) => updatePuppy(puppy.id, 'color', e.target.value)}
                      placeholder="e.g., Black, Golden"
                      className={hasValidationError('color', puppy.color) ? 'border-red-500' : ''}
                    />
                    <p className="text-xs text-gray-400 mt-1">Can be added later</p>
                  </div>

                  <div>
                    <Label htmlFor={`collar-${puppy.id}`}>Colour Collar (Optional)</Label>
                    <Select
                      value={puppy.colourCollar}
                      onValueChange={(value) => updatePuppy(puppy.id, 'colourCollar', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select collar (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {collarColorOptions.map((color) => (
                          <SelectItem key={color.value} value={color.value}>
                            {color.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-400 mt-1">Buyer can choose this too</p>
                  </div>

                  {pricingOption === 'individual' && (
                    <div>
                      <Label htmlFor={`price-${puppy.id}`}>Price (€) *</Label>
                      <Input
                        id={`price-${puppy.id}`}
                        type="number"
                        value={puppy.price}
                        onChange={(e) => updatePuppy(puppy.id, 'price', e.target.value)}
                        placeholder="1500"
                        min="0"
                        className={hasValidationError('price', puppy.price) ? 'border-red-500' : ''}
                      />
                      {hasValidationError('price', puppy.price) && (
                        <p className="text-red-500 text-sm mt-1">Price is required</p>
                      )}
                    </div>
                  )}

                  <div>
                    <Label htmlFor={`microchip-${puppy.id}`}>Microchip Number *</Label>
                    <Input
                      id={`microchip-${puppy.id}`}
                      value={puppy.microchipNumber}
                      onChange={(e) => updatePuppy(puppy.id, 'microchipNumber', e.target.value)}
                      placeholder="15-digit number"
                      maxLength={15}
                      className={hasValidationError('microchipNumber', puppy.microchipNumber) ? 'border-red-500' : ''}
                    />
                  </div>

                  <div>
                    <HealthLabel
                      htmlFor={`v1-${puppy.id}`}
                      tooltip="Vaccination stage 1"
                    >
                      V1 Code (Optional)
                    </HealthLabel>
                    <HealthCodeInput
                      id={`v1-${puppy.id}`}
                      value={puppy.v1Code}
                      onChange={(value) => updatePuppy(puppy.id, 'v1Code', value)}
                      codeType="V1"
                      placeholder="Enter V1 code (e.g., RDS1V1123456)"
                      excludeListingId={excludeListingId}
                      excludeListingType="sale"
                    />
                  </div>

                  <div>
                    <HealthLabel
                      htmlFor={`v2-${puppy.id}`}
                      tooltip="Vaccination stage 2"
                    >
                      V2 Code (Optional)
                    </HealthLabel>
                    <HealthCodeInput
                      id={`v2-${puppy.id}`}
                      value={puppy.v2Code}
                      onChange={(value) => updatePuppy(puppy.id, 'v2Code', value)}
                      codeType="V2"
                      placeholder="Enter V2 code (e.g., RDS1V2123456)"
                      excludeListingId={excludeListingId}
                      excludeListingType="sale"
                    />
                  </div>

                  <div>
                    <HealthLabel
                      htmlFor={`h1-${puppy.id}`}
                      tooltip="Health Certificate 1"
                    >
                      H1 Code (Optional)
                    </HealthLabel>
                    <HealthCodeInput
                      id={`h1-${puppy.id}`}
                      value={puppy.h1Code}
                      onChange={(value) => updatePuppy(puppy.id, 'h1Code', value)}
                      codeType="H1"
                      placeholder="Enter H1 code (e.g., RDS1H1123456)"
                      excludeListingId={excludeListingId}
                      excludeListingType="sale"
                    />
                  </div>

                </div>

                <div className="mt-4 border-t pt-4">
                  <Label>Puppy Image (Optional)</Label>
                  <div className="mt-2">
                    <ImageUploader
                      key={`puppy-image-${puppy.id}`}
                      uploaderId={`image-upload-${puppy.id}`}
                      value={puppy.imageUrl ? [puppy.imageUrl] : []}
                      onChange={(urls) => handleImageUpdate(puppy.id, urls)}
                      onImagesSelected={(urls) => handleImageUpdate(puppy.id, urls)}
                      onImageDeleted={() => handleImageUpdate(puppy.id, [])}
                      bucketName="puppy-images"
                      folder={listingId ? `sale-listings/${listingId}/puppies/${puppy.id}` : `sale-listings/temp/puppies/${puppy.id}`}
                      maxImages={1}
                      listingType="sale"
                    />
                  </div>
                </div>

                <div className="mt-4 border-t pt-4">
                  <Label>Supporting Documents (Optional)</Label>
                  <p className="text-xs text-gray-400 mt-1 mb-2">
                    Upload documents specific to this puppy (health certificates, etc.)
                  </p>
                  <DocumentUploader
                    value={puppy.documents || []}
                    onChange={(documents) => {
                      if (handlePuppyDocumentsChange) {
                        handlePuppyDocumentsChange(puppy.id, documents);
                      } else {
                        console.error('handlePuppyDocumentsChange is not defined');
                        // Fallback: update directly
                        onPuppiesChange((currentPuppies) =>
                          currentPuppies.map(p =>
                            p.id === puppy.id ? { ...p, documents } : p
                          )
                        );
                      }
                    }}
                    maxDocuments={5}
                  />
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export { PuppyMicrochipDetails };

