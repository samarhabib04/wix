import { Metadata } from 'next';
import { generateMetadata as generateSEOMetadata } from '@/lib/utils/seo';
import { getFullUrl, getDefaultOgImage } from '@/lib/config/seo';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Cookie Policy | Dog Quest',
  description: 'Learn about how Dog Quest uses cookies to improve your browsing experience and provide our services.',
  url: getFullUrl('/cookie-policy'),
  image: getDefaultOgImage(),
  keywords: ['cookie policy', 'cookies', 'tracking', 'privacy', 'data collection'],
  type: 'website',
});

export default function CookiePolicyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

