import { Metadata } from 'next';
import { generateMetadata as generateSEOMetadata } from '@/lib/utils/seo';
import { getFullUrl, getDefaultOgImage } from '@/lib/config/seo';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Seller Information | Dog Quest',
  description: 'Learn about the different types of sellers on Dog Quest - Private Individuals, Registered Sellers, and Dog Breeding Establishments (DBEs). Understand your obligations and what buyers can expect.',
  url: getFullUrl('/sellers/info'),
  image: getDefaultOgImage(),
  keywords: ['dog seller information', 'private dog seller', 'registered dog breeder', 'DBE', 'dog breeding establishment', 'seller obligations'],
  type: 'website',
});

export default function SellerInfoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

