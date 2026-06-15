import { Metadata } from 'next';
import { generateMetadata as generateSEOMetadata } from '@/lib/utils/seo';
import { SEO_CONFIG, getFullUrl, getDefaultOgImage } from '@/lib/config/seo';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Become a DogQuest Affiliated Vet | DogQuest',
  description: 'Join DogQuest as an affiliated vet and help build a better, safer future for puppies in Ireland. Free to join with no fees or subscriptions.',
  url: getFullUrl('/affiliated-vet'),
  image: getDefaultOgImage(),
  keywords: ['affiliated vet', 'vet partnership', 'veterinarian network', 'vet registration', 'Ireland'],
  type: 'website',
});

export default function AffiliatedVetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}






























