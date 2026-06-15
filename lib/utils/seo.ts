import type { Metadata } from 'next';

export type OpenGraphType = 'website' | 'article' | 'book' | 'profile' | 'music.song' | 'music.album' | 'music.playlist' | 'music.radio_station' | 'video.movie' | 'video.episode' | 'video.tv_show' | 'video.other';

export interface SEOConfig {
  title: string;
  description: string;
  url?: string;
  image?: string;
  type?: OpenGraphType;
  keywords?: string[];
  noindex?: boolean;
  nofollow?: boolean;
}

export interface OpenGraphConfig {
  title: string;
  description: string;
  url: string;
  siteName: string;
  images: Array<{
    url: string;
    width?: number;
    height?: number;
    alt?: string;
  }>;
  locale?: string;
  type?: OpenGraphType;
}

export interface TwitterCardConfig {
  card: 'summary' | 'summary_large_image' | 'app' | 'player';
  title: string;
  description: string;
  images?: string[];
  site?: string;
  creator?: string;
}

/**
 * Generate OpenGraph metadata
 */
export function generateOpenGraphMetadata(config: OpenGraphConfig): Metadata['openGraph'] {
  return {
    title: config.title,
    description: config.description,
    url: config.url,
    siteName: config.siteName,
    images: config.images.map(img => ({
      url: img.url,
      width: img.width || 1200,
      height: img.height || 630,
      alt: img.alt || config.title,
    })),
    locale: config.locale || 'en_IE',
    type: config.type || 'website',
  };
}

/**
 * Generate Twitter Card metadata
 */
export function generateTwitterCardMetadata(config: TwitterCardConfig): Metadata['twitter'] {
  return {
    card: config.card,
    title: config.title,
    description: config.description,
    images: config.images || [],
    site: config.site,
    creator: config.creator,
  };
}

/**
 * Build canonical URL
 */
export function buildCanonicalUrl(path: string, baseUrl?: string): string {
  const siteUrl = baseUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://dogquest.ie';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${siteUrl}${cleanPath}`;
}

/**
 * Generate complete metadata object
 */
export function generateMetadata(config: SEOConfig, baseUrl?: string): Metadata {
  const siteUrl = baseUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://dogquest.ie';
  const canonicalUrl = config.url || buildCanonicalUrl('', siteUrl);
  const defaultImage = `${siteUrl}/og-image.jpg`;

  const openGraph = generateOpenGraphMetadata({
    title: config.title,
    description: config.description,
    url: canonicalUrl,
    siteName: 'Dog Quest',
    images: [
      {
        url: config.image || defaultImage,
        width: 1200,
        height: 630,
        alt: config.title,
      },
    ],
    locale: 'en_IE',
    type: config.type || 'website',
  });

  const twitter = generateTwitterCardMetadata({
    card: 'summary_large_image',
    title: config.title,
    description: config.description,
    images: [config.image || defaultImage],
    site: '@dogquest',
  });

  return {
    title: config.title,
    description: config.description,
    keywords: config.keywords,
    openGraph,
    twitter,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: !config.noindex,
      follow: !config.nofollow,
    },
  };
}

/**
 * Get default metadata template
 */
export function getDefaultMetadata(): Partial<Metadata> {
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://dogquest.ie'),
    applicationName: 'Dog Quest',
    referrer: 'origin-when-cross-origin',
    authors: [{ name: 'Dog Quest Team' }],
    creator: 'Dog Quest',
    publisher: 'Dog Quest',
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
  };
}

