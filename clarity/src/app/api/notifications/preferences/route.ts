import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserPlan, PLAN_LIMITS, upgradeRequired } from '@/lib/subscription'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  // Return defaults if no preferences set yet
  return NextResponse.json(data ?? {
    email_enabled: true,
    inapp_enabled: true,
    weekly_digest: true,
    new_subscription_alert: true,
    large_transaction_alert: true,
    large_transaction_threshold: 100,
  })
}

export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const {
    email_enabled,
    inapp_enabled,
    weekly_digest,
    new_subscription_alert,
    large_transaction_alert,
    large_transaction_threshold,
  } = body

  // Gate email notifications behind plus/pro
  const plan = await getUserPlan(user.id, supabase)
  const allowsEmail = PLAN_LIMITS[plan].emailNotifications
  if (!allowsEmail && (email_enabled || weekly_digest || new_subscription_alert || large_transaction_alert)) {
    return NextResponse.json(upgradeRequired('email_notifications', 'plus'), { status: 403 })
  }

  const { data, error } = await supabase
    .from('notification_preferences')
    .upsert({
      user_id: user.id,
      email_enabled: email_enabled ?? true,
      inapp_enabled: inapp_enabled ?? true,
      weekly_digest: weekly_digest ?? true,
      new_subscription_alert: new_subscription_alert ?? true,
      large_transaction_alert: large_transaction_alert ?? true,
      large_transaction_threshold: large_transaction_threshold ?? 100,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
