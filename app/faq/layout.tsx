import { Metadata } from 'next';
import { generateMetadata as generateSEOMetadata } from '@/lib/utils/seo';
import { SEO_CONFIG, getFullUrl, getDefaultOgImage } from '@/lib/config/seo';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Frequently Asked Questions | Dog Quest',
  description: 'Find answers to common questions about buying, selling, and joining the Dog Quest community in Ireland.',
  url: getFullUrl('/faq'),
  image: getDefaultOgImage(),
  keywords: ['FAQ', 'frequently asked questions', 'dog quest help', 'buying dogs', 'selling dogs', 'Ireland'],
  type: 'website',
});

export default function FAQLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}






























