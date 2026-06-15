import React, { useState, useEffect, useMemo } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Dog, Shield, Scale, Info, AlertTriangle, CreditCard, Loader2, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AvailabilityResult, getCollarColorHex, isPuppyReserved } from '@/lib/utils/availability-utils';

interface ReservationModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    listing: any;
    availability: AvailabilityResult;
    onSubmit: (data: any) => Promise<void>;
    isProcessing: boolean;
}

export function ReservationModal({
    open,
    onOpenChange,
    listing,
    availability,
    onSubmit,
    isProcessing
}: ReservationModalProps) {
    const [selectedPuppyId, setSelectedPuppyId] = useState<string>('');
    const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
    const [selectedCollar, setSelectedCollar] = useState<string>('');
    const [message, setMessage] = useState('');

    // Reset state when modal opens
    useEffect(() => {
        if (open) {

            setSelectedPuppyId('');
            setGenderFilter('all');
            setSelectedCollar('');
            setMessage('');
        }
    }, [open, listing?.id, listing?.puppy_details]);

    // Get all puppies from listing with isReserved field (now stored in database)
    const allPuppies = useMemo(() => {
        if (!listing?.puppy_details || !Array.isArray(listing.puppy_details)) {
            return [];
        }
        // Filter out puppies without required fields
        // isReserved is now stored in database via trigger, use it directly
        const puppies = listing.puppy_details
            .filter((p: any) => p && p.id && p.sex)
            .map((p: any) => ({
                ...p,
                // Use stored isReserved from database, fallback to false if not set
                isReserved: p.isReserved === true
            }));
        return puppies;
    }, [listing?.puppy_details]);

    // Filter puppies by availability and gender
    const availablePuppies = useMemo(() => {
        return allPuppies.filter((puppy: any) => {
            // Check if puppy is reserved (using isReserved field from puppy object)
            if (puppy.isReserved) return false;

            // Apply gender filter
            if (genderFilter === 'all') return true;
            if (genderFilter === 'male') return puppy.sex === 'male';
            if (genderFilter === 'female') return puppy.sex === 'female';
            return true;
        });
    }, [allPuppies, genderFilter]);

    // Calculate available counts by gender (using stored isReserved from database)
    const availableCounts = useMemo(() => {
        const available = allPuppies.filter((puppy: any) => 
            puppy.isReserved !== true // Use stored isReserved from database
        );
        
        return {
            male: available.filter((p: any) => p.sex === 'male').length,
            female: available.filter((p: any) => p.sex === 'female').length,
            total: available.length
        };
    }, [allPuppies]);

    // Get selected puppy details
    const selectedPuppy = useMemo(() => {
        if (!selectedPuppyId) return null;
        const puppy = allPuppies.find((p: any) => p.id === selectedPuppyId);
        return puppy;
    }, [selectedPuppyId, allPuppies]);

    // Auto-select collar color when puppy is selected (if puppy has colourCollar)
    useEffect(() => {
        if (selectedPuppy && selectedPuppy.colourCollar) {
            // Auto-select the puppy's collar color
            setSelectedCollar(selectedPuppy.colourCollar);
        } else {
            // Clear selection if puppy doesn't have a collar or puppy is deselected
            setSelectedCollar('');
        }
    }, [selectedPuppy]);

    // Get collar colors from listing, including selected puppy's colourCollar if it exists
    const collarColors = useMemo(() => {
        const colors: string[] = [];
        
        // Add colors from listing
        if (listing?.selected_colors) {
            if (Array.isArray(listing.selected_colors)) {
                colors.push(...listing.selected_colors);
            } else {
                colors.push(listing.selected_colors);
            }
        }
        
        // Add selected puppy's colourCollar if it exists and isn't already in the list
        if (selectedPuppy?.colourCollar) {
            const puppyCollar = selectedPuppy.colourCollar.trim();
            if (puppyCollar && !colors.some(c => c.toLowerCase() === puppyCollar.toLowerCase())) {
                colors.push(puppyCollar);
            }
        }
        
        return colors;
    }, [listing?.selected_colors, selectedPuppy?.colourCollar]);

    const handleSubmit = () => {
        if (!selectedPuppyId || !selectedPuppy) {
            return;
        }

        // If puppy has colourCollar, use selected collar (which should be pre-selected)
        // If puppy doesn't have colourCollar, don't send collar color
        const collarColor = selectedPuppy.colourCollar 
            ? (selectedCollar || selectedPuppy.colourCollar)
            : '';

        const data: any = {
            reservationType: 'individual', // Always individual now
            puppyId: selectedPuppyId,
            puppyGender: selectedPuppy.sex,
            puppyColor: selectedPuppy.color,
            collarColor: collarColor,
            message: message.trim() || '',
        };
        onSubmit(data);
    };

    const canProceed = () => {
        if (!selectedPuppyId || !selectedPuppy) return false;
        // Check if selected puppy is still available (using stored isReserved from database)
        if (selectedPuppy.isReserved === true) return false;
        
        // If puppy has colourCollar, collar selection is required
        if (selectedPuppy.colourCollar && !selectedCollar) {
            return false;
        }
        
        return true;
    };

    // Check if all puppies are reserved
    const isSoldOut = availableCounts.total === 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold font-berkshire text-brand-dark-green flex items-center gap-2">
                        <Dog className="h-6 w-6" />
                        Reserve Your Puppy
                    </DialogTitle>
                    <DialogDescription>
                        Secure your choice with a €50 deposit. The remaining balance is paid directly to the seller.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-6">
                    {/* Check if listing has puppy details */}
                    {allPuppies.length === 0 ? (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                                This listing does not have individual puppy details available. Please contact the seller for more information.
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <>
                    {/* Sold Out Message */}
                    {isSoldOut && (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                                All puppies in this listing have been reserved. Please check back later or browse other listings.
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Gender Filter */}
                    {!isSoldOut && (
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-muted-foreground" />
                            <Label className="text-sm font-medium">Filter by Gender:</Label>
                            <div className="flex gap-2">
                                <Button
                                    variant={genderFilter === 'all' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setGenderFilter('all')}
                                >
                                    All ({availableCounts.total})
                                </Button>
                                <Button
                                    variant={genderFilter === 'male' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setGenderFilter('male')}
                                    disabled={availableCounts.male === 0}
                                >
                                    ♂ Male ({availableCounts.male})
                                </Button>
                                <Button
                                    variant={genderFilter === 'female' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setGenderFilter('female')}
                                    disabled={availableCounts.female === 0}
                                >
                                    ♀ Female ({availableCounts.female})
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Puppy Grid */}
                    {!isSoldOut && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-lg">Select a Puppy</h3>
                                <span className="text-sm text-gray-500">
                                    {availablePuppies.length} {genderFilter === 'all' ? 'available' : genderFilter === 'male' ? 'male' : 'female'} {availablePuppies.length === 1 ? 'puppy' : 'puppies'}
                                </span>
                            </div>

                            {availablePuppies.length === 0 ? (
                                <Alert>
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertDescription>
                                        No {genderFilter === 'all' ? '' : genderFilter === 'male' ? 'male' : 'female'} puppies available. Try selecting a different filter.
                                    </AlertDescription>
                                </Alert>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {availablePuppies.map((puppy: any) => {
                                        const isReserved = puppy.isReserved || false; // Use isReserved from puppy object
                                        const isSelected = selectedPuppyId === puppy.id;

                                        return (
                                            <Card
                                                key={puppy.id}
                                                className={cn(
                                                    "cursor-pointer transition-all relative overflow-hidden group",
                                                    isReserved ? "opacity-60 grayscale cursor-not-allowed bg-gray-50" : "hover:border-brand-dark-green hover:shadow-md",
                                                    isSelected && "ring-2 ring-brand-dark-green border-brand-dark-green bg-brand-light-green/10"
                                                )}
                                                onClick={() => !isReserved && setSelectedPuppyId(puppy.id)}
                                            >
                                                {/* Reserved Overlay */}
                                                {isReserved && (
                                                    <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center backdrop-blur-[1px]">
                                                        <Badge variant="destructive" className="text-lg px-4 py-1 shadow-sm font-bold">
                                                            RESERVED
                                                        </Badge>
                                                    </div>
                                                )}

                                                <div className="flex flex-col h-full">
                                                    {/* Puppy Image Section */}
                                                    <div className="w-full h-48 bg-gray-100 relative">
                                                        {puppy.imageUrl ? (
                                                            <img
                                                                src={puppy.imageUrl}
                                                                alt={`${puppy.color} ${puppy.sex} puppy`}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                                <Dog className="h-12 w-12" />
                                                            </div>
                                                        )}
                                                        {/* Gender Badge overlapping image */}
                                                        <div className="absolute top-2 left-2">
                                                            <Badge variant={puppy.sex === 'male' ? 'default' : 'secondary'} className="shadow-sm text-xs px-2 h-6">
                                                                {puppy.sex === 'male' ? '♂ Male' : '♀ Female'}
                                                            </Badge>
                                                        </div>
                                                        {isSelected && (
                                                            <div className="absolute top-2 right-2">
                                                                <Badge className="bg-green-600 h-6 px-2">
                                                                    <CheckIcon className="w-3 h-3 mr-1" />
                                                                    Selected
                                                                </Badge>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Details Section */}
                                                    <CardContent className="flex-1 p-3 space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-semibold text-gray-900">
                                                                {puppy.color || 'Puppy'}
                                                            </span>
                                                        </div>

                                                        {/* Color Tag */}
                                                        {puppy.color && (
                                                            <Badge variant="outline" className="text-xs">
                                                                {puppy.color}
                                                            </Badge>
                                                        )}

                                                        {/* Collar Color */}
                                                        {puppy.colourCollar && (
                                                            <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                                                <div
                                                                    className="w-3 h-3 rounded-full border border-gray-300 shadow-sm"
                                                                    style={{ backgroundColor: getCollarColorHex(puppy.colourCollar) }}
                                                                />
                                                                <span className="capitalize">{puppy.colourCollar} collar</span>
                                                            </div>
                                                        )}

                                                        {/* Weight */}
                                                        {puppy.weight && (
                                                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                                                <Scale className="h-3 w-3" />
                                                                <span>{puppy.weight}</span>
                                                            </div>
                                                        )}

                                                        {/* Price */}
                                                        {puppy.price && listing.same_pricing === 'no' && (
                                                            <div className="mt-2 pt-2 border-t border-dashed">
                                                                <span className="font-bold text-brand-dark-green">€{puppy.price}</span>
                                                            </div>
                                                        )}
                                                    </CardContent>
                                                </div>
                                            </Card>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Collar Color Selection - Only shown if puppy has colourCollar */}
                    {selectedPuppy && !isSoldOut && selectedPuppy.colourCollar && (
                        <div className="space-y-2 pt-4 border-t">
                            <Label className="text-base font-semibold">Collar Color</Label>
                            <p className="text-sm text-muted-foreground mb-3">
                                This puppy has a <strong>{selectedPuppy.colourCollar}</strong> collar. You can select a different color from the options below.
                            </p>
                            <Select value={selectedCollar} onValueChange={setSelectedCollar} required>
                                <SelectTrigger className="w-full md:w-64">
                                    <SelectValue placeholder="Select a collar color" />
                                </SelectTrigger>
                                <SelectContent>
                                    {collarColors.map((color: string) => (
                                        <SelectItem key={color} value={color}>
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-3 h-3 rounded-full border border-gray-200"
                                                    style={{ backgroundColor: getCollarColorHex(color) }}
                                                />
                                                {color}
                                                {color.toLowerCase() === selectedPuppy.colourCollar?.toLowerCase() && (
                                                    <Badge variant="outline" className="ml-2 text-xs">Puppy's Collar</Badge>
                                                )}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {!selectedCollar && (
                                <p className="text-xs text-red-600 mt-1">Please select a collar color</p>
                            )}
                        </div>
                    )}

                    {/* Selected Puppy Summary */}
                    {selectedPuppy && !isSoldOut && (
                        <Alert className="bg-brand-light-green/10 border-brand-soft-green">
                            <Info className="h-4 w-4 text-brand-dark-green" />
                            <AlertDescription className="text-brand-dark-green">
                                <strong>Selected:</strong> {selectedPuppy.color || 'Puppy'} - {selectedPuppy.sex === 'male' ? '♂ Male' : '♀ Female'}
                                {selectedPuppy.colourCollar && ` (${selectedPuppy.colourCollar} collar)`}
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Message Section */}
                    <div className="space-y-2 pt-2">
                        <Label htmlFor="message">Message to Seller (Optional)</Label>
                        <Textarea
                            id="message"
                            placeholder="Any questions or special requests?"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="resize-none"
                            rows={2}
                        />
                    </div>
                        </>
                    )}
                </div>

                <DialogFooter className="border-t pt-4 flex-col sm:flex-row gap-3 sm:gap-0">
                    <div className="flex flex-col sm:flex-row items-center justify-between w-full">
                        <div className="flex items-center gap-2 mb-4 sm:mb-0">
                            <span className="text-gray-600">Reservation Deposit:</span>
                            <span className="text-xl font-bold text-brand-dark-green">€50.00</span>
                        </div>
                        <div className="flex gap-3 w-full sm:w-auto">
                            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 sm:flex-none">
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={!selectedPuppyId || !selectedPuppy || !canProceed() || isProcessing || isSoldOut || allPuppies.length === 0}
                                className="flex-1 sm:flex-none bg-brand-dark-green hover:bg-brand-soft-green min-w-[160px]"
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <CreditCard className="mr-2 h-4 w-4" />
                                        {isSoldOut ? 'All Reserved' : allPuppies.length === 0 ? 'No Puppies Available' : 'Reserve This Puppy'}
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function CheckIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}
