import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { plaidClient } from '@/lib/plaid'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { public_token, institution_name, institution_id } = await request.json()

  if (!public_token || !institution_name || !institution_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({ public_token })
    const { access_token, item_id } = exchangeResponse.data

    const { error } = await supabase.from('bank_connections').upsert(
      {
        user_id: user.id,
        access_token,
        item_id,
        institution_name,
        institution_id,
        last_synced_at: null,
      },
      { onConflict: 'item_id' }
    )

    if (error) {
      console.error('DB error saving bank connection:', error)
      return NextResponse.json({ error: 'Failed to save bank connection' }, { status: 500 })
    }

    return NextResponse.json({ success: true, institution_name })
  } catch (err) {
    console.error('Plaid exchange token error:', err)
    return NextResponse.json({ error: 'Failed to exchange token' }, { status: 500 })
  }
}
