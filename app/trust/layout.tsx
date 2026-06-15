import { Metadata } from 'next';
import { generateMetadata as generateSEOMetadata } from '@/lib/utils/seo';
import { SEO_CONFIG, getFullUrl, getDefaultOgImage } from '@/lib/config/seo';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Why Trust Dog Quest? | Verified Dogs for Sale in Ireland',
  description: 'Learn about Dog Quest\'s verification system, vet partnerships, and commitment to animal welfare. Buy with confidence from verified breeders.',
  url: getFullUrl('/trust'),
  image: getDefaultOgImage(),
  keywords: ['trust dog quest', 'verified breeders', 'vet verified', 'animal welfare', 'safe dog buying', 'Ireland'],
  type: 'website',
});

export default function TrustLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}






























