import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { generateMetadata as generateSEOMetadata } from '@/lib/utils/seo';
import { SEO_CONFIG, getImageUrl, getFullUrl } from '@/lib/config/seo';
import StructuredData from '@/components/seo/StructuredData';
import { generateProductSchema, generateBreadcrumbSchema } from '@/components/seo/StructuredData';
import { formatBreedName } from '@/lib/utils/breed-utils';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  
  try {
    const { data: listing, error } = await supabase
      .from('sale_listings')
      .select('id, title, description, images, breed, location, price, min_price, max_price')
      .eq('id', id)
      .eq('admin_approved', true)
      .eq('is_published', true)
      .single();

    if (error || !listing) {
      return {
        title: 'Listing Not Found | Dog Quest',
        description: 'The listing you are looking for could not be found.',
      };
    }

    const images = Array.isArray(listing.images) ? listing.images : [];
    const primaryImage = images[0] || null;
    const listingImage = primaryImage ? getImageUrl(primaryImage) : SEO_CONFIG.images.default;
    
    const price = listing.price || listing.min_price || listing.max_price || 0;
    const priceText = listing.min_price && listing.max_price
      ? `€${listing.min_price} - €${listing.max_price}`
      : price > 0
        ? `€${price}`
        : 'Price on request';

    const title = `${listing.title} - ${formatBreedName(listing.breed)} | Dog Quest`;
    const description = listing.description 
      ? `${listing.description.substring(0, 155)}...`
      : `${listing.title} - ${formatBreedName(listing.breed)} available in ${listing.location}. ${priceText}.`;

    const listingUrl = getFullUrl(`/listing/${id}`);

    return generateSEOMetadata({
      title,
      description,
      url: listingUrl,
      image: listingImage,
      keywords: [
        'dogs for sale',
        'puppies for sale',
        formatBreedName(listing.breed),
        listing.location,
        'Ireland',
        'dog breeders',
      ],
      type: 'website',
    });
  } catch (error) {
    console.error('Error generating listing metadata:', error);
    return {
      title: 'Listing Details | Dog Quest',
      description: 'View detailed information about this dog listing.',
    };
  }
}

export default async function ListingDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  
  let listingSchema = null;
  let breadcrumbSchema = null;

  try {
    const { data: listing } = await supabase
      .from('sale_listings')
      .select('id, title, description, images, breed, location, price, min_price, max_price')
      .eq('id', id)
      .eq('admin_approved', true)
      .eq('is_published', true)
      .single();

    if (listing) {
      const images = Array.isArray(listing.images) ? listing.images : [];
      const primaryImage = images[0] ? getImageUrl(images[0]) : undefined;
      
      const price = listing.price || listing.min_price || listing.max_price || 0;

      listingSchema = generateProductSchema({
        name: listing.title,
        description: listing.description || `${listing.title} - ${formatBreedName(listing.breed)}`,
        image: primaryImage ? [primaryImage] : undefined,
        price: price > 0 ? price : undefined,
        currency: 'EUR',
        availability: 'InStock',
        url: getFullUrl(`/listing/${id}`),
      });

      breadcrumbSchema = generateBreadcrumbSchema([
        { name: 'Home', url: SEO_CONFIG.siteUrl },
        { name: 'Listings', url: getFullUrl('/listings') },
        { name: listing.title, url: getFullUrl(`/listing/${id}`) },
      ]);
    }
  } catch (error) {
    console.error('Error generating structured data:', error);
  }

  return (
    <>
      {listingSchema && <StructuredData data={listingSchema} />}
      {breadcrumbSchema && <StructuredData data={breadcrumbSchema} />}
      {children}
    </>
  );
}






























