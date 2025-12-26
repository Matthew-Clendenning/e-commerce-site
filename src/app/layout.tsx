import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'
import type { Metadata } from 'next'
import Navigation from '@/components/Navigation'
import CartSidebar from '@/components/CartSidebar'
import CartSyncHandler from '@/components/CartSyncHandler'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  metadataBase: new URL("https://e-commerce-site-eight-blush.vercel.app"),
  title: {
    default: 'Premium Accessories Store | Watches, Jewelry & More',
    template: '%s | Premium Accessories Store'
  },
  description: 'Shop our exclusive collection of premium watches, bracelets, rings, belts, and necklaces. Quality accessories for every style and occasion.',
  keywords: ['watches', 'jewelry', 'accessories', 'bracelets', 'rings', 'necklaces', 'belts', 'premium accessories', 'luxury watches'],
  authors: [{ name: 'YOUR STORE NAME' }],
  creator: 'YOUR STORE NAME',
  publisher: 'YOUR STORE NAME',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    title: 'Premium Accessories Store | Watches, Jewelry & More',
    description: 'Shop our exclusive collection of premium watches, bracelets, rings, belts, and necklaces. Quality accessories for every style and occasion.',
    url: 'https://e-commerce-site-eight-blush.vercel.app',
    siteName: 'Premium Accessories Store',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Premium Accessories Store'
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Premium Accessories Store | Watches, Jewelry & More',
    description: 'Shop our exclusive collection of premium watches, bracelets, rings, belts, and necklaces. Quality accessories for every style and occasion.',
    images: ['/og-image.jpg'],
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
  verification: {
    google: 'YOUR_GOOGLE_VERIFICATION_CODE',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider
      afterMultiSessionSingleSignOutUrl="/"
      afterSignOutUrl="/"
    >
      <html lang="en">
        <body>
          <Navigation />
          <CartSyncHandler />
          {children}
          <CartSidebar />
          <Toaster
            position="top-right"
            richColors
            closeButton
            duration={4000}
          />
        </body>
      </html>
    </ClerkProvider>
  )
}