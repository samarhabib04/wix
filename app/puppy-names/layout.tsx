import { Metadata } from 'next';
import { generateMetadata as generateSEOMetadata } from '@/lib/utils/seo';
import { SEO_CONFIG, getFullUrl, getDefaultOgImage } from '@/lib/config/seo';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Puppy Name Archive | Dog Quest',
  description: 'Browse popular puppy names from Ireland and around the world for inspiration for your new furry friend.',
  url: getFullUrl('/puppy-names'),
  image: getDefaultOgImage(),
  keywords: ['puppy names', 'dog names', 'name ideas', 'popular dog names', 'Ireland'],
  type: 'website',
});

export default function PuppyNamesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}






























