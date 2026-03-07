import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserPlan, PLAN_LIMITS, upgradeRequired } from '@/lib/subscription'
import { generateReport } from '@/lib/reports'
import type { ReportTemplate, ReportPeriod } from '@/lib/reports'
import { startOfMonth, format } from 'date-fns'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const plan = await getUserPlan(user.id, supabase)
  const limits = PLAN_LIMITS[plan]

  // Scheduled reports (weekly/annual) require Pro
  const { period = 'monthly', template = 'full_clarity', customSections, periodStart, periodEnd } =
    await req.json() as {
      period?: ReportPeriod
      template?: ReportTemplate
      customSections?: string[]
      periodStart?: string
      periodEnd?: string
    }

  if (period === 'weekly' || period === 'annual') {
    if (!limits.financialReports) {
      return NextResponse.json(upgradeRequired('financial_reports', 'pro'), { status: 403 })
    }
  }

  // On-demand reports: check monthly limit
  if (!limits.financialReports) {
    if (limits.onDemandReports === 0) {
      return NextResponse.json(upgradeRequired('financial_reports', 'plus'), { status: 403 })
    }
    if (limits.onDemandReports !== Infinity) {
      // Count reports this calendar month
      const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')
      const { count } = await supabase
        .from('financial_reports')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', `${monthStart}T00:00:00`)

      if ((count ?? 0) >= limits.onDemandReports) {
        return NextResponse.json(upgradeRequired('financial_reports', 'pro'), { status: 403 })
      }
    }
  }

  try {
    const report = await generateReport(user.id, supabase, {
      period,
      template,
      customSections,
      periodStart,
      periodEnd,
    })

    const { data, error } = await supabase
      .from('financial_reports')
      .insert({
        user_id: user.id,
        period,
        period_start: report.periodStart,
        period_end: report.periodEnd,
        template,
        content: report,
      })
      .select('id')
      .single()

    if (error) throw error

    return NextResponse.json({ report: { ...report, id: data.id } }, { status: 201 })
  } catch (err: any) {
    console.error('Report generation error:', err)
    return NextResponse.json({ error: err?.message ?? 'Failed to generate report' }, { status: 500 })
  }
}
