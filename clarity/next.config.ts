import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Allow camera on same origin (needed for mobile receipt upload)
  { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(), camera=(self)' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  // Allow service worker to control all paths
  { key: 'Service-Worker-Allowed', value: '/' },
]

const nextConfig: NextConfig = {
  allowedDevOrigins: ["localhost", "127.0.0.1"],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

export default withSentryConfig(nextConfig, {
  // Sentry org and project (fill these in once you create a Sentry project)
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Only upload source maps if a Sentry auth token is present (skips local builds)
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,

  // Don't widen the Sentry bundle when DSN is missing
  disableLogger: true,
});
