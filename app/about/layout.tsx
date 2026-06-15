import { Metadata } from 'next';
import { generateMetadata as generateSEOMetadata } from '@/lib/utils/seo';
import { SEO_CONFIG, getFullUrl, getDefaultOgImage } from '@/lib/config/seo';

export const metadata: Metadata = generateSEOMetadata({
  title: 'About Us | Dog Quest',
  description: 'Learn about Dog Quest\'s mission, meet the team, and explore how we work with vets across Ireland to create a trusted dog marketplace.',
  url: getFullUrl('/about'),
  image: getDefaultOgImage(),
  keywords: ['about dog quest', 'dog marketplace Ireland', 'trusted breeders', 'vet verified'],
  type: 'website',
});

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}






























