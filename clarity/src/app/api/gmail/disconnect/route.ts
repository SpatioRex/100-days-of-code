import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { connectionId } = body

  const query = supabase.from('gmail_connections').delete().eq('user_id', user.id)

  // If a specific connection ID is provided, only delete that one
  if (connectionId) {
    query.eq('id', connectionId)
  }

  const { error } = await query
  if (error) return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })

  return NextResponse.json({ success: true })
}
