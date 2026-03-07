import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('user_preferences')
    .select('income_amount, income_week_type, income_source, income_linked_merchant')
    .eq('user_id', user.id)
    .single()

  return NextResponse.json({
    income_amount:          data?.income_amount          ?? null,
    income_week_type:       data?.income_week_type       ?? '5-day',
    income_source:          data?.income_source          ?? 'manual',
    income_linked_merchant: data?.income_linked_merchant ?? null,
  })
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { income_amount, income_week_type, income_source, income_linked_merchant } = body

  // Validate
  if (income_amount !== null && income_amount !== undefined && (isNaN(Number(income_amount)) || Number(income_amount) < 0)) {
    return NextResponse.json({ error: 'Invalid income amount' }, { status: 400 })
  }
  if (income_week_type && !['5-day', '7-day'].includes(income_week_type)) {
    return NextResponse.json({ error: 'Invalid week type' }, { status: 400 })
  }
  if (income_source && !['manual', 'linked'].includes(income_source)) {
    return NextResponse.json({ error: 'Invalid income source' }, { status: 400 })
  }

  // Build upsert payload
  const payload: Record<string, unknown> = {
    user_id:    user.id,
    updated_at: new Date().toISOString(),
  }

  if (income_week_type       !== undefined) payload.income_week_type       = income_week_type ?? '5-day'
  if (income_source          !== undefined) payload.income_source          = income_source ?? 'manual'
  if (income_linked_merchant !== undefined) payload.income_linked_merchant = income_linked_merchant?.trim() || null

  // For manual mode, take the provided amount directly
  if (income_source !== 'linked' && income_amount !== undefined) {
    payload.income_amount = income_amount !== null ? Number(income_amount) || null : null
  }

  // For linked mode, auto-resolve income_amount from the most recent matching transaction
  if (income_source === 'linked' && income_linked_merchant) {
    const merchant = income_linked_merchant.trim()
    const { data: latestTx } = await supabase
      .from('transactions')
      .select('amount, date')
      .eq('user_id', user.id)
      .ilike('merchant', `%${merchant}%`)
      .order('date', { ascending: false })
      .limit(1)
      .single()

    if (latestTx) {
      payload.income_amount = Number(latestTx.amount)
    } else if (income_amount !== undefined) {
      // No matching transaction yet — use the manually provided amount as fallback
      payload.income_amount = income_amount !== null ? Number(income_amount) || null : null
    }
  }

  const { error } = await supabase
    .from('user_preferences')
    .upsert(payload, { onConflict: 'user_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Return the fully resolved record so client can update state without a refetch
  const { data: updated } = await supabase
    .from('user_preferences')
    .select('income_amount, income_week_type, income_source, income_linked_merchant')
    .eq('user_id', user.id)
    .single()

  return NextResponse.json({
    success:                true,
    income_amount:          updated?.income_amount          ?? null,
    income_week_type:       updated?.income_week_type       ?? '5-day',
    income_source:          updated?.income_source          ?? 'manual',
    income_linked_merchant: updated?.income_linked_merchant ?? null,
  })
}
