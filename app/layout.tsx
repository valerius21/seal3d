import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://seal3d.vercel.app'),
  title: {
    default: "Seal3D - Client-Side File Encryption",
    template: "%s | Seal3D"
  },
  description: "Secure AES-256-GCM file encryption powered by Web Crypto API. A modern hat.sh alternative with zero server uploads. Encrypt & decrypt files entirely in your browser with password-based protection.",
  keywords: [
    "file encryption",
    "AES-256-GCM",
    "client-side encryption",
    "hat.sh alternative",
    "browser encryption",
    "Web Crypto API",
    "secure file encryption",
    "password encryption",
    "PBKDF2",
    "privacy",
    "zero-knowledge encryption",
    "local file encryption",
    "encrypt files online",
    "decrypt files",
    "no server upload"
  ],
  authors: [{ name: "Valerius Mattfeld", url: "https://github.com/valerius21" }],
  creator: "Valerius Mattfeld",
  publisher: "Seal3D",
  applicationName: "Seal3D",
  category: "Security",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://seal3d.vercel.app",
    title: "Seal3D - Client-Side File Encryption",
    description: "Secure AES-256-GCM file encryption powered by Web Crypto API. A modern hat.sh alternative with zero server uploads.",
    siteName: "Seal3D",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Seal3D - Client-Side File Encryption"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Seal3D - Client-Side File Encryption",
    description: "Secure AES-256-GCM file encryption powered by Web Crypto API. A modern hat.sh alternative.",
    images: ["/opengraph-image"],
    creator: "@valerius21"
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
  },
  manifest: "/manifest.json",
  alternates: {
    canonical: "https://seal3d.vercel.app"
  },
  verification: {
    // Add your verification codes here when you have them
    // google: 'google-site-verification-code',
    // yandex: 'yandex-verification-code',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Seal3D',
    applicationCategory: 'SecurityApplication',
    operatingSystem: 'Any',
    description: 'Secure AES-256-GCM file encryption powered by Web Crypto API. A modern hat.sh alternative with zero server uploads.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    featureList: [
      'AES-256-GCM Encryption',
      'Client-Side Only Processing',
      'Zero Server Upload',
      'PBKDF2 Key Derivation',
      'Password-Based Protection',
      'Open Source'
    ],
    browserRequirements: 'Requires JavaScript and Web Crypto API support',
    creator: {
      '@type': 'Person',
      name: 'Valerius Mattfeld',
      url: 'https://github.com/valerius21'
    }
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
