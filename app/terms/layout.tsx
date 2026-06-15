import { Metadata } from 'next';
import { generateMetadata as generateSEOMetadata } from '@/lib/utils/seo';
import { getFullUrl, getDefaultOgImage } from '@/lib/config/seo';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Terms & Conditions | Dog Quest',
  description: 'Terms and Conditions for Dog Quest - Rules and guidelines for using our platform.',
  url: getFullUrl('/terms'),
  image: getDefaultOgImage(),
  keywords: ['terms and conditions', 'terms of service', 'dog quest terms', 'user agreement'],
  type: 'website',
});

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

