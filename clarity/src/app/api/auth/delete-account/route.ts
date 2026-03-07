import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = user.id

  // Delete all personal data — RLS ensures we only touch this user's rows
  const tables = [
    'transactions',
    'gmail_connections',
    'bank_connections',
    'notifications',
    'notification_preferences',
    'user_preferences',
  ]

  for (const table of tables) {
    await supabase.from(table).delete().eq('user_id', userId)
  }

  // Sign the user out
  await supabase.auth.signOut()

  return NextResponse.json({ success: true })
}
