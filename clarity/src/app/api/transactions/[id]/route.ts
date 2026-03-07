import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { merchant, amount, date, category, recurring_type, custom_label } = body

  // Build update object with only allowed fields
  const updates: Record<string, unknown> = {}
  if (merchant !== undefined) updates.merchant = merchant
  if (amount !== undefined) updates.amount = parseFloat(amount)
  if (date !== undefined) updates.date = date
  if (category !== undefined) updates.category = category
  if (recurring_type !== undefined) {
    updates.recurring_type = recurring_type || null
    updates.is_recurring = recurring_type === 'subscription' || recurring_type === 'payment'
  }
  if (custom_label !== undefined) updates.custom_label = custom_label || null

  const { data, error } = await supabase
    .from('transactions')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id) // ensure user owns this transaction
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
