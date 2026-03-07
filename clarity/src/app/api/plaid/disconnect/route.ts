import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { plaidClient } from '@/lib/plaid'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { connection_id } = await request.json()
  if (!connection_id) return NextResponse.json({ error: 'Missing connection_id' }, { status: 400 })

  const { data: conn } = await supabase
    .from('bank_connections')
    .select('access_token')
    .eq('id', connection_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!conn) return NextResponse.json({ error: 'Connection not found' }, { status: 404 })

  try {
    await plaidClient.itemRemove({ access_token: (conn as any).access_token })
  } catch {
    // Continue even if Plaid revocation fails
  }

  await supabase.from('bank_connections').delete().eq('id', connection_id).eq('user_id', user.id)

  return NextResponse.json({ success: true })
}
