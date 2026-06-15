import { Metadata } from 'next';
import { generateMetadata as generateSEOMetadata } from '@/lib/utils/seo';
import { SEO_CONFIG, getFullUrl, getDefaultOgImage } from '@/lib/config/seo';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Dog Quest Shop | Premium Products for Your Canine Companion',
  description: 'Discover our handpicked collection of premium dog products. From puppy collars to starter kits, find everything you need for your canine companion.',
  url: getFullUrl('/shop'),
  image: getDefaultOgImage(),
  keywords: ['dog products', 'puppy collars', 'dog accessories', 'dog quest shop', 'dog supplies ireland'],
  type: 'website',
});

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

