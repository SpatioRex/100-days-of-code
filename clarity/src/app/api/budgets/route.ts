import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  startOfDay, endOfDay,
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
  format,
} from 'date-fns'
import type { BudgetWithSpend } from '@/types/database'
import { getUserPlan, PLAN_LIMITS, isAtLimit, upgradeRequired } from '@/lib/subscription'

function getPeriodRange(period: string): { start: string; end: string } {
  const now = new Date()
  if (period === 'daily') {
    return {
      start: format(startOfDay(now), 'yyyy-MM-dd'),
      end: format(endOfDay(now), 'yyyy-MM-dd'),
    }
  }
  if (period === 'weekly') {
    return {
      start: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      end: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    }
  }
  return {
    start: format(startOfMonth(now), 'yyyy-MM-dd'),
    end: format(endOfMonth(now), 'yyyy-MM-dd'),
  }
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: budgets, error } = await supabase
    .from('budgets')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Compute spend for each budget in the current period
  const budgetsWithSpend: BudgetWithSpend[] = await Promise.all(
    (budgets ?? []).map(async (budget) => {
      const { start, end } = getPeriodRange(budget.period)

      let query = supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', user.id)
        .gte('date', start)
        .lte('date', end)

      if (budget.category) {
        query = query.eq('category', budget.category)
      }
      if (budget.merchant) {
        query = query.ilike('merchant', `%${budget.merchant}%`)
      }

      const { data: txns } = await query
      const spent = (txns ?? []).reduce((sum, t) => sum + Number(t.amount), 0)
      const pct = budget.amount > 0 ? (spent / budget.amount) * 100 : 0

      return {
        ...budget,
        spent,
        periodStart: start,
        periodEnd: end,
        remaining: budget.amount - spent,
        percentUsed: pct,
        status:
          spent === 0 ? 'no-activity'
          : spent > budget.amount ? 'over'
          : pct >= 80 ? 'warning'
          : 'on-track',
      } satisfies BudgetWithSpend
    })
  )

  return NextResponse.json({ budgets: budgetsWithSpend })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const plan = await getUserPlan(user.id, supabase)
  const limit = PLAN_LIMITS[plan].budgets

  if (limit === 0) {
    return NextResponse.json(upgradeRequired('budgets', 'plus'), { status: 403 })
  }

  if (limit !== Infinity) {
    const { count } = await supabase
      .from('budgets')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (isAtLimit(count ?? 0, limit)) {
      return NextResponse.json(upgradeRequired('budgets', 'plus'), { status: 403 })
    }
  }

  const body = await req.json()
  const { name, category, merchant, amount, period } = body

  if (!name || !amount || !period) {
    return NextResponse.json({ error: 'name, amount and period are required' }, { status: 400 })
  }
  if (!['daily', 'weekly', 'monthly'].includes(period)) {
    return NextResponse.json({ error: 'Invalid period' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('budgets')
    .insert({
      user_id: user.id,
      name,
      category: category || null,
      merchant: merchant || null,
      amount: Number(amount),
      period,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ budget: data }, { status: 201 })
}
