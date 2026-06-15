/**
 * Centralized SEO configuration for Dog Quest
 */

export const SEO_CONFIG = {
  siteName: 'Dog Quest',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://dogquest.ie',
  defaultTitle: "DogQuest - Ireland's Premier Dog Marketplace",
  defaultDescription: "Find your perfect dog companion in Ireland. Browse pedigrees, mixed breeds, stud services, and more.",
  defaultKeywords: ['dogs', 'puppies', 'Ireland', 'pedigree', 'stud services', 'dog marketplace', 'dog breeders Ireland'],
  
  // Social Media
  social: {
    twitter: '@dogquest',
    facebook: 'https://www.facebook.com/dogquest',
    instagram: 'https://www.instagram.com/dogquest',
  },
  
  // Default Images
  images: {
    default: '/og-image.jpg',
    logo: '/logo.png',
    favicon: '/favicon.ico',
    appleTouchIcon: '/apple-touch-icon.png',
  },
  
  // OpenGraph defaults
  openGraph: {
    type: 'website' as const,
    locale: 'en_IE',
    siteName: 'Dog Quest',
    imageWidth: 1200,
    imageHeight: 630,
  },
  
  // Twitter Card defaults
  twitter: {
    card: 'summary_large_image' as const,
    site: '@dogquest',
  },
  
  // Organization info for structured data
  organization: {
    name: 'Dog Quest',
    url: 'https://dogquest.ie',
    logo: 'https://dogquest.ie/logo.png',
    description: "Ireland's Premier Dog Marketplace",
    contactPoint: {
      contactType: 'Customer Service',
      areaServed: 'IE',
      availableLanguage: 'en',
    },
    sameAs: [
      'https://www.facebook.com/dogquest',
      'https://www.instagram.com/dogquest',
    ],
  },
} as const;

/**
 * Get full URL for a path
 */
export function getFullUrl(path: string): string {
  const baseUrl = SEO_CONFIG.siteUrl;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}

/**
 * Get default OpenGraph image URL
 */
export function getDefaultOgImage(): string {
  return getFullUrl(SEO_CONFIG.images.default);
}

/**
 * Get image URL for a listing/blog/etc
 */
export function getImageUrl(imagePath?: string | null): string {
  if (!imagePath) return getDefaultOgImage();
  
  // If already a full URL, return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // If starts with /, it's a relative path
  if (imagePath.startsWith('/')) {
    return getFullUrl(imagePath);
  }
  
  // Otherwise, assume it's a Supabase storage URL or external URL
  return imagePath;
}

