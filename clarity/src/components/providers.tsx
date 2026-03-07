'use client'

import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import { Analytics } from '@vercel/analytics/react'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
      <Toaster richColors position="top-right" />
      <Analytics />
    </ThemeProvider>
  )
}
