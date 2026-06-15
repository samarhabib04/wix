import { Metadata } from 'next';
import { generateMetadata as generateSEOMetadata } from '@/lib/utils/seo';
import { SEO_CONFIG, getFullUrl, getDefaultOgImage } from '@/lib/config/seo';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Trusted Pet Services in Ireland | Dog Quest',
  description: 'Find reliable veterinarians, groomers, and pet stores across Ireland with Dog Quest\'s verified service directory.',
  url: getFullUrl('/services'),
  image: getDefaultOgImage(),
  keywords: ['veterinarians Ireland', 'dog groomers', 'pet stores', 'pet services', 'vet directory'],
  type: 'website',
});

export default function ServicesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}






























