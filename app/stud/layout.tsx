import { Metadata } from 'next';
import { generateMetadata as generateSEOMetadata } from '@/lib/utils/seo';
import { SEO_CONFIG, getFullUrl, getDefaultOgImage } from '@/lib/config/seo';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Stud Services | Dog Quest',
  description: 'Find quality stud services for your dog. Browse verified stud dogs with health clearances and champion bloodlines.',
  url: getFullUrl('/stud'),
  image: getDefaultOgImage(),
  keywords: ['stud services', 'stud dogs', 'dog breeding', 'champion bloodlines', 'Ireland'],
  type: 'website',
});

export default function StudLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}






























