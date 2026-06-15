import { Metadata } from 'next';
import { generateMetadata as generateSEOMetadata } from '@/lib/utils/seo';
import { SEO_CONFIG, getFullUrl, getDefaultOgImage } from '@/lib/config/seo';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Browse Pedigree Breeds | Dog Quest',
  description: 'Find your perfect pedigree dog by browsing different purebred breeds. Filter by size, grooming needs, and energy level to find the right match for your family.',
  url: getFullUrl('/breeds'),
  image: getDefaultOgImage(),
  keywords: ['dog breeds', 'pedigree dogs', 'purebred dogs', 'dog breed guide', 'Ireland'],
  type: 'website',
});

export default function BreedsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}






























