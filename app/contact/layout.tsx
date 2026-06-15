import { Metadata } from 'next';
import { generateMetadata as generateSEOMetadata } from '@/lib/utils/seo';
import { SEO_CONFIG, getFullUrl, getDefaultOgImage } from '@/lib/config/seo';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Contact Us | Dog Quest',
  description: 'Get in touch with Dog Quest. We\'re here to help with questions, support, and feedback.',
  url: getFullUrl('/contact'),
  image: getDefaultOgImage(),
  keywords: ['contact dog quest', 'customer support', 'help', 'feedback'],
  type: 'website',
});

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}






























