import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { generateMetadata as generateSEOMetadata } from '@/lib/utils/seo';
import { SEO_CONFIG, getImageUrl, getFullUrl } from '@/lib/config/seo';
import StructuredData from '@/components/seo/StructuredData';
import { generateBreedSchema, generateBreadcrumbSchema } from '@/components/seo/StructuredData';

// Helper function to create breed slug (matches the one used in the app)
function createBreedSlug(breedName: string): string {
  return breedName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .trim();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  
  try {
    // Handle crossbreeds special case
    if (slug === 'crossbreeds') {
      return generateSEOMetadata({
        title: 'Crossbreeds - Mixed Breed Dogs | Dog Quest',
        description: 'Explore all our adorable crossbreed puppies including Cockapoos, Cavapoos, and more! Find your perfect mixed breed companion in Ireland.',
        url: getFullUrl('/breeds/crossbreeds'),
        image: getImageUrl('https://images.unsplash.com/photo-1587300003388-59208cc962cb?q=80&w=600&auto=format&fit=crop'),
        keywords: ['crossbreeds', 'mixed breed dogs', 'cockapoo', 'cavapoo', 'designer dogs', 'Ireland'],
        type: 'website',
      });
    }

    // Fetch breed data
    const { data: breeds, error } = await supabase
      .from('quiz_breeds')
      .select('breed, breed_type, description, image_url, size, grooming, energy, life_expectancy')
      .order('breed');

    if (error || !breeds) {
      return {
        title: 'Breed Not Found | Dog Quest',
        description: 'The breed you are looking for could not be found.',
      };
    }

    // Find the breed that matches the slug
    const breed = breeds.find(b => createBreedSlug(b.breed) === slug);

    if (!breed) {
      return {
        title: 'Breed Not Found | Dog Quest',
        description: 'The breed you are looking for could not be found.',
      };
    }

    const breedImage = breed.image_url ? getImageUrl(breed.image_url) : SEO_CONFIG.images.default;
    const breedType = breed.breed_type || 'Breed';
    const title = `${breed.breed} - ${breedType} | Dog Quest`;
    const description = breed.description 
      ? `${breed.description.substring(0, 155)}...`
      : `Find ${breed.breed} ${breedType.toLowerCase()} puppies for sale in Ireland. Browse available listings and learn about this breed.`;

    const breedUrl = getFullUrl(`/breeds/${slug}`);

    return generateSEOMetadata({
      title,
      description,
      url: breedUrl,
      image: breedImage,
      keywords: [
        breed.breed,
        `${breed.breed} puppies`,
        `${breed.breed} for sale`,
        breedType,
        'Ireland',
        'dog breeds',
      ],
      type: 'website',
    });
  } catch (error) {
    console.error('Error generating breed metadata:', error);
    return {
      title: 'Breed Details | Dog Quest',
      description: 'View detailed information about this dog breed and available listings.',
    };
  }
}

export default async function BreedDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  
  let breedSchema = null;
  let breadcrumbSchema = null;

  try {
    if (slug === 'crossbreeds') {
      breadcrumbSchema = generateBreadcrumbSchema([
        { name: 'Home', url: SEO_CONFIG.siteUrl },
        { name: 'Breeds', url: getFullUrl('/breeds') },
        { name: 'Crossbreeds', url: getFullUrl('/breeds/crossbreeds') },
      ]);
    } else {
      const { data: breeds } = await supabase
        .from('quiz_breeds')
        .select('breed, breed_type, description, image_url, size, grooming, energy, life_expectancy')
        .order('breed');

      if (breeds) {
        const breed = breeds.find(b => createBreedSlug(b.breed) === slug);

        if (breed) {
          const breedType = breed.breed_type || 'Breed';
          breedSchema = generateBreedSchema({
            name: breed.breed,
            description: breed.description || `${breed.breed} - ${breedType}`,
            image: breed.image_url ? getImageUrl(breed.image_url) : undefined,
            url: getFullUrl(`/breeds/${slug}`),
            size: breed.size || undefined,
            grooming: breed.grooming || undefined,
            energy: breed.energy || undefined,
            lifeExpectancy: breed.life_expectancy || undefined,
          });

          breadcrumbSchema = generateBreadcrumbSchema([
            { name: 'Home', url: SEO_CONFIG.siteUrl },
            { name: 'Breeds', url: getFullUrl('/breeds') },
            { name: breed.breed, url: getFullUrl(`/breeds/${slug}`) },
          ]);
        }
      }
    }
  } catch (error) {
    console.error('Error generating structured data:', error);
  }

  return (
    <>
      {breedSchema && <StructuredData data={breedSchema} />}
      {breadcrumbSchema && <StructuredData data={breadcrumbSchema} />}
      {children}
    </>
  );
}






























