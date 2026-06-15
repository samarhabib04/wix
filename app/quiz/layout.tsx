import { Metadata } from 'next';
import { generateMetadata as generateSEOMetadata } from '@/lib/utils/seo';
import { SEO_CONFIG, getFullUrl, getDefaultOgImage } from '@/lib/config/seo';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Find Your Perfect Dog | Dog Quest',
  description: 'Take our quiz to find the perfect dog breed for your lifestyle and preferences.',
  url: getFullUrl('/quiz'),
  image: getDefaultOgImage(),
  keywords: ['dog breed quiz', 'find perfect dog', 'dog matching', 'breed selector', 'Ireland'],
  type: 'website',
});

export default function QuizLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}






























