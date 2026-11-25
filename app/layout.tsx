import type { Metadata, Viewport } from 'next';
import SourceCapture from '@/components/SourceCapture';
import { Inter, Noto_Sans_Gujarati, Noto_Sans_Devanagari } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { SITE_NAME, SITE_DESCRIPTION } from '@/lib/site';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

// Indic scripts: Inter has no Gujarati/Devanagari glyphs, so these are used as per-glyph fallbacks
const notoGujarati = Noto_Sans_Gujarati({
  subsets: ['gujarati'],
  display: 'swap',
  variable: '--font-noto-gujarati',
});

const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  display: 'swap',
  variable: '--font-noto-devanagari',
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://qr-video-portal-dr.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  // Icons come from the app/ file conventions (favicon.ico, icon.png, apple-icon.png), so Next.js
  // generates the <link> tags, with the right sizes, from the files themselves.
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: siteUrl,
    siteName: SITE_NAME,
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 675,
        alt: SITE_NAME,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: ['/og-image.jpg'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <body
        className={`${notoGujarati.variable} ${notoDevanagari.variable}`}
        style={{
          fontFamily:
            "var(--font-inter), var(--font-noto-gujarati), var(--font-noto-devanagari), system-ui, sans-serif",
        }}
      >
        <SourceCapture />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
