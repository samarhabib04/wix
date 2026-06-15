/**
 * Eircode geocoding utilities
 * Eircode is the Irish postal code system (7 characters: A65 F4E2 format)
 */

// Cache for geocoding results to avoid repeated API calls
const geocodeCache: { [key: string]: { lat: number, lng: number } | null } = {};

/**
 * Validates if a string is a valid Irish eircode format
 * Eircode format: 7 characters, space-separated (e.g., "A65 F4E2")
 * @param eircode - The eircode string to validate
 * @returns true if valid eircode format
 */
export function isValidEircode(eircode: string): boolean {
  if (!eircode || typeof eircode !== 'string') return false;
  
  // Remove spaces and convert to uppercase
  const cleaned = eircode.replace(/\s+/g, '').toUpperCase();
  
  // Eircode must be exactly 7 characters
  if (cleaned.length !== 7) return false;
  
  // Format: 3 characters (routing key) + 4 characters (unique identifier)
  // Both parts can contain letters A,C,D,E,F,H,K,N,P,R,T,V,W,X,Y and digits 0-9
  // Example: D01F5P2, A65F4E2, T12XY34
  const eircodePattern = /^[ACDEFHKNPRTVWXY0-9]{3}[ACDEFHKNPRTVWXY0-9]{4}$/;
  
  return eircodePattern.test(cleaned);
}

/**
 * Formats an eircode to standard format (A65 F4E2)
 * @param eircode - The eircode string to format
 * @returns Formatted eircode or null if invalid
 */
export function formatEircode(eircode: string): string | null {
  if (!isValidEircode(eircode)) return null;
  
  const cleaned = eircode.replace(/\s+/g, '').toUpperCase();
  // Insert space after 3rd character
  return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
}

/**
 * Eircode string for UI copy (standard spacing when valid; otherwise best-effort uppercase).
 */
export function formatEircodeForDisplay(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const t = raw.trim();
  return formatEircode(t) ?? t.replace(/\s+/g, ' ').toUpperCase();
}

/**
 * Validates that coordinates are within Ireland's bounds
 * Ireland approximate bounds: lat 51.4-55.4, lng -10.5 to -5.9
 */
function isValidIrishCoordinate(lat: number, lng: number): boolean {
  return lat >= 51.4 && lat <= 55.4 && lng >= -10.5 && lng <= -5.9;
}

/**
 * Sleep function for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Geocodes an Irish eircode to coordinates
 * Uses OpenStreetMap Nominatim API with eircode-specific formatting
 * Includes retry logic, better query variations, and coordinate validation
 * @param eircode - The eircode to geocode
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @returns Promise with coordinates { lat, lng } or null if not found
 */
export async function geocodeEircode(
  eircode: string,
  maxRetries: number = 3
): Promise<{ lat: number, lng: number } | null> {
  // Clean and validate the eircode directly (bypass potential caching issues)
  if (!eircode || typeof eircode !== 'string') {
    return null;
  }
  
  const cleaned = eircode.replace(/\s+/g, '').toUpperCase();
  
  if (cleaned.length !== 7) {
    return null;
  }
  
  // Direct pattern validation to avoid caching issues
  const eircodePattern = /^[ACDEFHKNPRTVWXY0-9]{3}[ACDEFHKNPRTVWXY0-9]{4}$/;
  if (!eircodePattern.test(cleaned)) {
    return null;
  }

  // Format the eircode (insert space after 3rd character)
  const formatted = `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;

  // Check cache first
  if (geocodeCache[formatted] !== undefined) {
    return geocodeCache[formatted];
  }

  // Extract routing key (first 3 characters) for Dublin-specific queries
  const routingKey = formatted.substring(0, 3);
  const isDublinEircode = ['D01', 'D02', 'D03', 'D04', 'D05', 'D06', 'D07', 'D08', 'D09', 'D10', 'D11', 'D12', 'D13', 'D14', 'D15', 'D16', 'D17', 'D18', 'D20', 'D22', 'D24'].includes(routingKey);

  // Try different eircode query formats with more variations
  const queries = [
    `${formatted}, Ireland`,
    `${formatted}, Republic of Ireland`,
    isDublinEircode ? `${formatted}, Dublin, Ireland` : null,
    isDublinEircode ? `${formatted}, Co. Dublin, Ireland` : null,
    `${formatted}, Co. Ireland`,
    formatted,
    // Try with "Co." prefix for county
    `${formatted}, Co.`,
  ].filter(Boolean) as string[];

  // Retry logic with exponential backoff
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    for (const query of queries) {
      try {
        // Add delay between retries (exponential backoff)
        if (attempt > 0) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Max 5 seconds
          await sleep(delay);
        }

        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=ie`,
          {
            headers: {
              'User-Agent': 'DogQuest/1.0', // Required by Nominatim
            },
          }
        );

        if (!response.ok) {
          console.error(`Nominatim API error (attempt ${attempt + 1}/${maxRetries}):`, response.statusText);
          continue;
        }

        const data = await response.json();

        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);

          // Validate coordinates are in Ireland
          if (!isValidIrishCoordinate(lat, lng)) {
            continue; // Try next query variation
          }

          const coords = { lat, lng };

          // Cache the result for all query variations
          queries.forEach(q => {
            geocodeCache[q] = coords;
          });
          geocodeCache[formatted] = coords;

          return coords;
        }
      } catch (error) {
        console.error(`Error geocoding eircode (attempt ${attempt + 1}/${maxRetries}):`, query, error);
        continue;
      }
    }
  }

  // Cache null result to avoid repeated failed attempts
  geocodeCache[formatted] = null;
  return null;
}

/**
 * Checks if a string might be an eircode (heuristic check)
 * Useful for detecting eircodes in address fields
 * @param text - The text to check
 * @returns true if text might be an eircode
 */
export function mightBeEircode(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  
  // Remove spaces and check length
  const cleaned = text.replace(/\s+/g, '').toUpperCase();
  
  // Eircode is 7 characters
  if (cleaned.length !== 7) return false;
  
  // Check if it matches eircode pattern
  // Eircode format: 3 characters (routing key) + 4 characters (unique identifier)
  // Both parts can contain letters A,C,D,E,F,H,K,N,P,R,T,V,W,X,Y and digits 0-9
  return /^[ACDEFHKNPRTVWXY0-9]{3}[ACDEFHKNPRTVWXY0-9]{4}$/.test(cleaned);
}
