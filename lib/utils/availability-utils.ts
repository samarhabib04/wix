import { Database } from '@/lib/supabase/types';

type Listing = {
    id: string;
    male_count: number;
    female_count: number;
    puppy_details: any[] | null;
};

type Reservation = {
    id: string;
    listing_id: string;
    status: string;
    reservation_type?: 'basic' | 'individual' | null;
    puppy_gender?: 'male' | 'female' | null;
    puppy_id?: string | null;
    puppy_collar_color?: string | null;
};

export interface AvailabilityResult {
    availableMales: number;
    availableFemales: number;
    availableIndividualPuppies: any[];
    totalAvailable: number;
    isSoldOut: boolean;
    reservedMales: number;
    reservedFemales: number;
    reservedPuppyIds: string[];
}

/**
 * Calculate availability for a listing based on reservations
 * Handles both basic gender counts and individual puppy tracking
 */
export function calculateListingAvailability(
    listing: Listing | null,
    reservations: Reservation[] | null
): AvailabilityResult {
    if (!listing) {
        return {
            availableMales: 0,
            availableFemales: 0,
            availableIndividualPuppies: [],
            totalAvailable: 0,
            isSoldOut: true,
            reservedMales: 0,
            reservedFemales: 0,
            reservedPuppyIds: [],
        };
    }

    // Filter active reservations only
    // Include all statuses that represent active reservations
    const activeReservations = (reservations || []).filter((r) =>
        ['pending', 'confirmed', 'completed', 'awaiting_confirmation', 'both_confirmed'].includes(r.status)
    );

    // Separate by reservation type
    const basicReservations = activeReservations.filter(
        (r) => r.reservation_type === 'basic' || !r.reservation_type
    );
    const individualReservations = activeReservations.filter(
        (r) => r.reservation_type === 'individual'
    );

    // Calculate individual puppy availability first
    const reservedPuppyIds = individualReservations
        .map((r) => r.puppy_id)
        .filter((id): id is string => id !== null);

    const puppyDetails = Array.isArray(listing.puppy_details)
        ? listing.puppy_details
        : [];

    // Filter available puppies: check both reservedPuppyIds array AND isReserved flag
    const availableIndividualPuppies = puppyDetails.filter(
        (puppy) => {
            if (!puppy || !puppy.id) return false;
            // Check if puppy is in reserved IDs list
            if (reservedPuppyIds.includes(puppy.id)) return false;
            // Also check isReserved flag from database (double-check)
            if (puppy.isReserved === true) return false;
            return true;
        }
    );

    // Calculate gender availability from puppy_details if available (more accurate)
    // Otherwise fall back to male_count/female_count minus basic reservations
    let availableMales: number;
    let availableFemales: number;
    let reservedMales = 0;
    let reservedFemales = 0;

    if (puppyDetails.length > 0) {
        // Calculate from actual puppy details (more accurate)
        availableMales = availableIndividualPuppies.filter((p) => p.sex === 'male').length;
        availableFemales = availableIndividualPuppies.filter((p) => p.sex === 'female').length;
        
        // Also subtract basic reservations (gender-only reservations)
        reservedMales = basicReservations.filter(
            (r) => r.puppy_gender === 'male'
        ).length;
        reservedFemales = basicReservations.filter(
            (r) => r.puppy_gender === 'female'
        ).length;
        
        availableMales = Math.max(0, availableMales - reservedMales);
        availableFemales = Math.max(0, availableFemales - reservedFemales);
    } else {
        // Fallback to count-based calculation when no puppy_details
        reservedMales = basicReservations.filter(
            (r) => r.puppy_gender === 'male'
        ).length;
        reservedFemales = basicReservations.filter(
            (r) => r.puppy_gender === 'female'
        ).length;

        availableMales = Math.max(0, (listing.male_count || 0) - reservedMales);
        availableFemales = Math.max(0, (listing.female_count || 0) - reservedFemales);
    }

    // Total availability
    const totalAvailable = availableMales + availableFemales;

    const isSoldOut = totalAvailable === 0;

    return {
        availableMales,
        availableFemales,
        availableIndividualPuppies,
        totalAvailable,
        isSoldOut,
        reservedMales,
        reservedFemales,
        reservedPuppyIds,
    };
}

/**
 * Get unique colors from puppy details
 */
export function getUniqueColors(puppyDetails: any[]): string[] {
    const colors = puppyDetails
        .filter((p) => p && p.color)
        .map((p) => p.color);
    return [...new Set(colors)];
}

/**
 * Get available colors for a specific gender
 */
export function getAvailableColorsByGender(
    availablePuppies: any[],
    gender: 'male' | 'female'
): string[] {
    const colors = availablePuppies
        .filter((p) => p && p.sex === gender && p.color)
        .map((p) => p.color);
    return [...new Set(colors)];
}

/**
 * Map collar color names to hex codes for visual display
 */
export function getCollarColorHex(colorName: string): string {
    const colorMap: Record<string, string> = {
        'Light Grey': '#D3D3D3',
        'Dark Grey': '#696969',
        'Orange': '#FFA500',
        'Brown': '#8B4513',
        'Black': '#000000',
        'Yellow': '#FFFF00',
        'Gold': '#FFD700',
        'Wine': '#722F37',
        'Purple': '#800080',
        'Dark Blue': '#00008B',
        'Light Blue': '#ADD8E6',
        'Green': '#008000',
        'Red': '#FF0000',
        'Pink': '#FFC0CB',
        'Other': '#CCCCCC',
    };
    return colorMap[colorName] || '#CCCCCC';
}

/**
 * Check if a specific puppy is reserved
 */
export function isPuppyReserved(
    puppyId: string,
    reservedPuppyIds: string[]
): boolean {
    return reservedPuppyIds.includes(puppyId);
}

/**
 * Format availability text for display
 */
export function formatAvailabilityText(availability: AvailabilityResult): string {
    const { availableMales, availableFemales, availableIndividualPuppies } = availability;

    if (availability.isSoldOut) {
        return 'Sold Out';
    }

    if (availableIndividualPuppies.length > 0) {
        return `${availableIndividualPuppies.length} puppy${availableIndividualPuppies.length > 1 ? 'ies' : ''} available`;
    }

    const parts = [];
    if (availableMales > 0) parts.push(`${availableMales}M`);
    if (availableFemales > 0) parts.push(`${availableFemales}F`);

    return parts.length > 0 ? parts.join(' / ') : 'Sold Out';
}

/**
 * Calculate available puppies by gender from puppy_details array
 * This is more accurate than using male_count/female_count when puppy_details exist
 */
export function calculateAvailabilityFromPuppyDetails(
    puppyDetails: any[],
    reservedPuppyIds: string[]
): { male: number; female: number; total: number } {
    const availablePuppies = puppyDetails.filter(
        (puppy) => puppy && puppy.id && !reservedPuppyIds.includes(puppy.id)
    );

    return {
        male: availablePuppies.filter((p) => p.sex === 'male').length,
        female: availablePuppies.filter((p) => p.sex === 'female').length,
        total: availablePuppies.length,
    };
}

/**
 * Filter puppies by gender
 */
export function filterPuppiesByGender(
    puppies: any[],
    gender: 'all' | 'male' | 'female'
): any[] {
    if (gender === 'all') return puppies;
    return puppies.filter((p) => p.sex === gender);
}
