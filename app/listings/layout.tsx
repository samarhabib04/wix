import { Metadata } from 'next';
import { generateMetadata as generateSEOMetadata } from '@/lib/utils/seo';
import { SEO_CONFIG, getFullUrl, getDefaultOgImage } from '@/lib/config/seo';

export const metadata: Metadata = {
  ...generateSEOMetadata({
    title: 'Dogs for Sale Ireland - Verified Breeders | DogQuest',
    description: 'Browse dogs for sale from verified breeders across Ireland. Find puppies for sale with health checks and documentation.',
    url: getFullUrl('/listings'),
    image: getDefaultOgImage(),
    keywords: ['dogs for sale Ireland', 'puppies for sale', 'dog breeders Ireland', 'buy dogs Ireland', 'puppies Ireland'],
    type: 'website',
  }),
  alternates: {
    canonical: getFullUrl('/listings'),
  },
};

export default function ListingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}






























