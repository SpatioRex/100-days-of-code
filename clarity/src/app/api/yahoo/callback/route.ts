import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { exchangeYahooCode, getYahooUserEmail } from '@/lib/yahoo'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(`${origin}/settings?error=yahoo_denied`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${origin}/login`)

  try {
    const { access_token, refresh_token } = await exchangeYahooCode(code)
    const email = await getYahooUserEmail(access_token)

    const { error: dbError } = await supabase
      .from('gmail_connections')
      .upsert(
        {
          user_id: user.id,
          email: email ?? 'yahoo-account',
          provider: 'yahoo',
          access_token,
          refresh_token,
          last_synced_at: null,
        },
        { onConflict: 'user_id,email' }
      )

    if (dbError) {
      console.error('DB error saving Yahoo connection:', dbError)
      return NextResponse.redirect(`${origin}/settings?error=yahoo_db_error`)
    }

    return NextResponse.redirect(`${origin}/settings?success=yahoo_connected`)
  } catch (err) {
    console.error('Yahoo OAuth callback error:', err)
    return NextResponse.redirect(`${origin}/settings?error=yahoo_oauth_failed`)
  }
}
