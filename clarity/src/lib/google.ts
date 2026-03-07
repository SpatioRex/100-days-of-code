import { google } from 'googleapis'

export function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_REDIRECT_URI!
  )
}

export function getAuthUrl() {
  const oauth2Client = getOAuthClient()
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // force refresh token every time
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
  })
}

// Keywords to search Gmail for
export const GMAIL_SEARCH_QUERY =
  'subject:(receipt OR invoice OR "order confirmation" OR payment OR subscription) newer_than:90d'
