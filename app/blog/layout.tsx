import { Metadata } from 'next';
import { generateMetadata as generateSEOMetadata } from '@/lib/utils/seo';
import { SEO_CONFIG, getFullUrl, getDefaultOgImage } from '@/lib/config/seo';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Dog Quest Blog | Expert Tips, Stories & Guides',
  description: 'Discover expert dog care tips, heartwarming stories, training guides, and health advice for your furry friend.',
  url: getFullUrl('/blog'),
  image: getDefaultOgImage(),
  keywords: ['dog blog', 'dog care tips', 'dog training', 'dog health', 'dog stories', 'Ireland'],
  type: 'website',
});

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}






























