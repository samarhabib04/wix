/**
 * Server Component for rendering JSON-LD structured data
 * This component renders structured data for SEO and rich snippets
 */

interface StructuredDataProps {
  data: Record<string, any> | Array<Record<string, any>>;
}

export default function StructuredData({ data }: StructuredDataProps) {
  const jsonLd = Array.isArray(data) ? data : [data];
  
  return (
    <>
      {jsonLd.map((item, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}
    </>
  );
}

/**
 * Generate Organization structured data
 */
export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Dog Quest',
    url: 'https://dogquest.ie',
    logo: 'https://dogquest.ie/logo.png',
    description: "Ireland's Premier Dog Marketplace",
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Service',
      areaServed: 'IE',
      availableLanguage: 'en',
    },
    sameAs: [
      'https://www.facebook.com/dogquest',
      'https://www.instagram.com/dogquest',
    ],
  };
}

/**
 * Generate Website structured data
 */
export function generateWebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Dog Quest',
    url: 'https://dogquest.ie',
    description: "Ireland's Premier Dog Marketplace",
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://dogquest.ie/listings?search={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * Generate BreadcrumbList structured data
 */
export function generateBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * Generate Product/Item structured data for listings
 */
export function generateProductSchema(listing: {
  name: string;
  description: string;
  image?: string | string[];
  price?: number;
  currency?: string;
  availability?: string;
  url: string;
  seller?: {
    name: string;
    url?: string;
  };
}) {
  const images = Array.isArray(listing.image) 
    ? listing.image 
    : listing.image 
      ? [listing.image] 
      : [];

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: listing.name,
    description: listing.description,
    image: images.length > 0 ? images : undefined,
    offers: listing.price
      ? {
          '@type': 'Offer',
          price: listing.price,
          priceCurrency: listing.currency || 'EUR',
          availability: listing.availability 
            ? `https://schema.org/${listing.availability}` 
            : 'https://schema.org/InStock',
          url: listing.url,
        }
      : undefined,
    seller: listing.seller
      ? {
          '@type': 'Organization',
          name: listing.seller.name,
          url: listing.seller.url,
        }
      : undefined,
  };
}

/**
 * Generate Article structured data for blog posts
 */
export function generateArticleSchema(post: {
  headline: string;
  description: string;
  image?: string;
  datePublished: string;
  dateModified?: string;
  author?: {
    name: string;
    url?: string;
  };
  publisher?: {
    name: string;
    logo?: string;
  };
  url: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.headline,
    description: post.description,
    image: post.image,
    datePublished: post.datePublished,
    dateModified: post.dateModified || post.datePublished,
    author: post.author
      ? {
          '@type': 'Person',
          name: post.author.name,
          url: post.author.url,
        }
      : {
          '@type': 'Person',
          name: 'Dog Quest Team',
        },
    publisher: post.publisher
      ? {
          '@type': 'Organization',
          name: post.publisher.name,
          logo: post.publisher.logo
            ? {
                '@type': 'ImageObject',
                url: post.publisher.logo,
              }
            : undefined,
        }
      : {
          '@type': 'Organization',
          name: 'Dog Quest',
          logo: {
            '@type': 'ImageObject',
            url: 'https://dogquest.ie/logo.png',
          },
        },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': post.url,
    },
  };
}

/**
 * Generate LocalBusiness structured data for services
 */
export function generateLocalBusinessSchema(business: {
  name: string;
  description: string;
  address: {
    streetAddress?: string;
    addressLocality: string;
    addressRegion?: string;
    postalCode?: string;
    addressCountry: string;
  };
  telephone?: string;
  image?: string;
  url: string;
  priceRange?: string;
  openingHours?: string[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: business.name,
    description: business.description,
    address: {
      '@type': 'PostalAddress',
      streetAddress: business.address.streetAddress,
      addressLocality: business.address.addressLocality,
      addressRegion: business.address.addressRegion,
      postalCode: business.address.postalCode,
      addressCountry: business.address.addressCountry,
    },
    telephone: business.telephone,
    image: business.image,
    url: business.url,
    priceRange: business.priceRange,
    openingHours: business.openingHours,
  };
}

/**
 * Generate Breed structured data
 */
export function generateBreedSchema(breed: {
  name: string;
  description: string;
  image?: string;
  url: string;
  size?: string;
  grooming?: string;
  energy?: string;
  lifeExpectancy?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Thing',
    name: breed.name,
    description: breed.description,
    image: breed.image,
    url: breed.url,
    additionalProperty: [
      breed.size && {
        '@type': 'PropertyValue',
        name: 'Size',
        value: breed.size,
      },
      breed.grooming && {
        '@type': 'PropertyValue',
        name: 'Grooming',
        value: breed.grooming,
      },
      breed.energy && {
        '@type': 'PropertyValue',
        name: 'Energy Level',
        value: breed.energy,
      },
      breed.lifeExpectancy && {
        '@type': 'PropertyValue',
        name: 'Life Expectancy',
        value: breed.lifeExpectancy,
      },
    ].filter(Boolean),
  };
}

