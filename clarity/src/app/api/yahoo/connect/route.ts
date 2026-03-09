import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { testYahooImapConnection } from '@/lib/yahoo'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { email, appPassword } = await req.json()
  if (!email || !appPassword) {
    return NextResponse.json({ error: 'email and appPassword are required' }, { status: 400 })
  }

  // Test the IMAP connection before storing
  try {
    await testYahooImapConnection(email.trim(), appPassword.trim())
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Could not connect to Yahoo Mail. Check your email and app password.' },
      { status: 400 }
    )
  }

  // Store in gmail_connections table with provider='yahoo'
  // access_token holds the app password; refresh_token=null signals app-password auth
  const { error: dbError } = await supabase.from('gmail_connections').upsert(
    {
      user_id: user.id,
      email: email.trim().toLowerCase(),
      provider: 'yahoo',
      access_token: appPassword.trim(),
      refresh_token: null,
      last_synced_at: null,
    },
    { onConflict: 'user_id,email' }
  )

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
