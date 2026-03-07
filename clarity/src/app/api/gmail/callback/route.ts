import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOAuthClient } from '@/lib/google'
import { google } from 'googleapis'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(`${origin}/settings?error=gmail_denied`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/login`)
  }

  try {
    const oauth2Client = getOAuthClient()
    const { tokens } = await oauth2Client.getToken(code)

    if (!tokens.access_token) {
      return NextResponse.redirect(`${origin}/settings?error=gmail_no_token`)
    }

    // Fetch the email address for this Gmail account
    oauth2Client.setCredentials(tokens)
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
    const { data: userInfo } = await oauth2.userinfo.get()
    const accountEmail = userInfo.email ?? 'unknown'

    // Upsert — one row per (user_id, email) so multiple accounts work
    const { error: dbError } = await supabase
      .from('gmail_connections')
      .upsert(
        {
          user_id: user.id,
          email: accountEmail,
          provider: 'gmail',
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token ?? null,
          last_synced_at: null,
        },
        { onConflict: 'user_id,email' }
      )

    if (dbError) {
      console.error('DB error saving Gmail connection:', dbError)
      return NextResponse.redirect(`${origin}/settings?error=gmail_db_error`)
    }

    return NextResponse.redirect(`${origin}/settings?success=gmail_connected`)
  } catch (err) {
    console.error('Gmail OAuth callback error:', err)
    return NextResponse.redirect(`${origin}/settings?error=gmail_oauth_failed`)
  }
}
