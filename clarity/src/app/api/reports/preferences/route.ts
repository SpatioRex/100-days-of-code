import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserPlan, PLAN_LIMITS, upgradeRequired } from '@/lib/subscription'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('report_preferences')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  return NextResponse.json(data ?? {
    template: 'full_clarity',
    custom_sections: null,
    delivery: 'inapp',
    frequency: 'monthly',
  })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const plan = await getUserPlan(user.id, supabase)
  const limits = PLAN_LIMITS[plan]

  const body = await req.json()
  const { template, custom_sections, delivery, frequency } = body

  // Scheduled auto-delivery requires Pro
  if (frequency && frequency !== 'monthly' && !limits.financialReports) {
    return NextResponse.json(upgradeRequired('financial_reports', 'pro'), { status: 403 })
  }
  if (delivery && delivery !== 'inapp' && limits.onDemandReports === 0) {
    return NextResponse.json(upgradeRequired('financial_reports', 'plus'), { status: 403 })
  }

  const { data, error } = await supabase
    .from('report_preferences')
    .upsert({
      user_id: user.id,
      template: template ?? 'full_clarity',
      custom_sections: custom_sections ?? null,
      delivery: delivery ?? 'inapp',
      frequency: frequency ?? 'monthly',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
