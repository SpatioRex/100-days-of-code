import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Capture 10% of transactions for performance monitoring
  tracesSampleRate: 0.1,

  // Only initialise if a DSN is configured (skips local dev by default)
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Don't capture errors from browser extensions or injected scripts
  denyUrls: [/extensions\//i, /chrome:\/\//i],
})
