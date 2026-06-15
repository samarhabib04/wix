import type { Metadata } from "next";
import { Inter, Berkshire_Swash } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import GlobalLayout from "@/components/GlobalLayout";
import StructuredData from "@/components/seo/StructuredData";
import { generateOrganizationSchema, generateWebsiteSchema } from "@/components/seo/StructuredData";
import { generateMetadata as generateSEOMetadata, getDefaultMetadata } from "@/lib/utils/seo";
import { SEO_CONFIG, getDefaultOgImage } from "@/lib/config/seo";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: 'swap',  // Prevent font render blocking
});

const berkshireSwash = Berkshire_Swash({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-berkshire",
  display: 'swap',  // Prevent font render blocking
});

const defaultMetadata = generateSEOMetadata({
  title: SEO_CONFIG.defaultTitle,
  description: SEO_CONFIG.defaultDescription,
  url: SEO_CONFIG.siteUrl,
  image: getDefaultOgImage(),
  keywords: [...SEO_CONFIG.defaultKeywords],
  type: "website",
});

export const metadata: Metadata = {
  ...getDefaultMetadata(),
  ...defaultMetadata,
  metadataBase: new URL(SEO_CONFIG.siteUrl),
  title: {
    default: SEO_CONFIG.defaultTitle,
    template: `%s | ${SEO_CONFIG.siteName}`,
  },
  description: SEO_CONFIG.defaultDescription,
  keywords: Array.from(SEO_CONFIG.defaultKeywords),
  authors: [{ name: "Dog Quest Team", url: "https://dogquest.ie" }],
  creator: SEO_CONFIG.siteName,
  publisher: SEO_CONFIG.siteName,
  category: 'Animals & Pets',
  classification: 'Pet Services',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
  openGraph: {
    ...defaultMetadata.openGraph,
    images: [
      {
        url: getDefaultOgImage(),
        width: 1200,
        height: 630,
        alt: SEO_CONFIG.defaultTitle,
      },
    ],
  },
  twitter: {
    ...defaultMetadata.twitter,
  },
  alternates: {
    canonical: SEO_CONFIG.siteUrl,
    languages: {
      'en-IE': SEO_CONFIG.siteUrl,
      'en': SEO_CONFIG.siteUrl,
    },
  },
  verification: {
    // Add verification codes if available
    // google: "your-google-verification-code",
    // yandex: "your-yandex-verification-code",
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const organizationSchema = generateOrganizationSchema();
  const websiteSchema = generateWebsiteSchema();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preconnect to Supabase for faster image loading */}
        <link rel="preconnect" href="https://sehzakutrlropprdcewu.supabase.co" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://sehzakutrlropprdcewu.supabase.co" />
        {/* Preconnect to Google Fonts for faster font loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Theme color for mobile browsers */}
        <meta name="theme-color" content="#9DD9B8" />
        <meta name="msapplication-TileColor" content="#9DD9B8" />
      </head>
      <body className={`${inter.variable} ${berkshireSwash.variable} font-sans antialiased`} suppressHydrationWarning>
        <StructuredData data={[organizationSchema, websiteSchema]} />
        <Providers>
          <GlobalLayout>
            {children}
          </GlobalLayout>
        </Providers>
      </body>
    </html>
  );
}
