import { Metadata } from 'next';
import { generateMetadata as generateSEOMetadata } from '@/lib/utils/seo';
import { getFullUrl, getDefaultOgImage } from '@/lib/config/seo';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Privacy Policy | Dog Quest',
  description: 'Privacy Policy for Dog Quest - Learn how we protect your data and comply with GDPR and Irish data protection laws.',
  url: getFullUrl('/privacy-policy'),
  image: getDefaultOgImage(),
  keywords: ['privacy policy', 'data protection', 'GDPR', 'dog quest privacy', 'data security'],
  type: 'website',
});

export default function PrivacyPolicyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

