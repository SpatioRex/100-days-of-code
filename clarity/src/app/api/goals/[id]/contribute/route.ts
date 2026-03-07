import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: goal_id } = await params

  // Verify the goal belongs to this user
  const { data: goal } = await supabase
    .from('goals')
    .select('id')
    .eq('id', goal_id)
    .eq('user_id', user.id)
    .single()

  if (!goal) return NextResponse.json({ error: 'Goal not found' }, { status: 404 })

  const body = await req.json()
  const { amount, note, date } = body

  if (!amount || Number(amount) <= 0) {
    return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('goal_contributions')
    .insert({
      goal_id,
      user_id: user.id,
      amount: Number(amount),
      note: note?.trim() || null,
      date: date || new Date().toISOString().split('T')[0],
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ contribution: data }, { status: 201 })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: goal_id } = await params
  const body = await req.json().catch(() => ({}))
  const { contribution_id } = body

  if (!contribution_id) {
    return NextResponse.json({ error: 'contribution_id required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('goal_contributions')
    .delete()
    .eq('id', contribution_id)
    .eq('user_id', user.id)
    .eq('goal_id', goal_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
