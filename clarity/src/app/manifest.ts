import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Clarity — Personal Finance',
    short_name: 'Clarity',
    description: "Understand where your money goes. Cancel what you don't need.",
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#0a0a0a',
    orientation: 'portrait',
    categories: ['finance', 'productivity'],
    icons: [
      {
        src: '/icon.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/apple-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
    screenshots: [
      {
        src: '/icon-512',
        sizes: '512x512',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'Clarity dashboard',
      },
    ],
  }
}
