import { Metadata } from 'next';
import { generateMetadata as generateSEOMetadata } from '@/lib/utils/seo';
import { SEO_CONFIG, getFullUrl, getDefaultOgImage } from '@/lib/config/seo';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Puppy Showcase | DogQuest',
  description: 'Browse our selection of upcoming puppies that will be available soon!',
  url: getFullUrl('/showcase'),
  image: getDefaultOgImage(),
  keywords: ['upcoming puppies', 'puppy showcase', 'future litters', 'preview puppies', 'Ireland'],
  type: 'website',
});

export default function ShowcaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}






























