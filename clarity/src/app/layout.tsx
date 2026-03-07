import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { PwaRegister } from '@/components/pwa-register'

const geist = Geist({ subsets: ['latin'] })

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://clarity.app'

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'Clarity — Personal Finance',
    template: '%s — Clarity',
  },
  description: "Understand where your money goes. Cancel what you don't need.",
  openGraph: {
    type: 'website',
    siteName: 'Clarity',
    title: 'Clarity — Personal Finance',
    description: "Understand where your money goes. Cancel what you don't need.",
    url: APP_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Clarity — Personal Finance',
    description: "Understand where your money goes. Cancel what you don't need.",
  },
  robots: {
    index: true,
    follow: true,
  },
  // PWA / mobile web app
  appleWebApp: {
    capable: true,
    title: 'Clarity',
    statusBarStyle: 'black-translucent',
  },
  applicationName: 'Clarity',
  formatDetection: {
    telephone: false,
  },
  manifest: '/manifest.webmanifest',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',   // handles iPhone notch / Dynamic Island
  themeColor: [
    { media: '(prefers-color-scheme: dark)',  color: '#0a0a0a' },
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={geist.className}>
        <Providers>{children}</Providers>
        <PwaRegister />
      </body>
    </html>
  )
}
