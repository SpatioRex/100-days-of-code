import { createClient } from '@/lib/supabase/server'
import { BudgetsClient } from './budgets-client'
import {
  startOfDay, endOfDay,
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
  differenceInDays, differenceInCalendarMonths,
  format,
} from 'date-fns'
import type { BudgetWithSpend, GoalWithProgress, GoalContribution, GoalPace } from '@/types/database'

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

function buildGoalWithProgress(
  goal: { id: string; user_id: string; name: string; target_amount: number; target_date: string; emoji: string; created_at: string },
  contributions: GoalContribution[]
): GoalWithProgress {
  const totalSaved   = contributions.reduce((s, c) => s + Number(c.amount), 0)
  const remaining    = Math.max(0, goal.target_amount - totalSaved)
  const percentSaved = goal.target_amount > 0 ? Math.min(100, (totalSaved / goal.target_amount) * 100) : 0

  const now        = new Date()
  const targetDate = new Date(goal.target_date)
  const createdAt  = new Date(goal.created_at)
  const daysLeft   = Math.max(0, differenceInDays(targetDate, now))

  const monthsActive   = Math.max(1, differenceInCalendarMonths(now, createdAt) + 1)
  const avgPerMonth    = totalSaved / monthsActive
  const monthsLeft     = Math.max(1, differenceInCalendarMonths(targetDate, now) + 1)
  const neededPerMonth = remaining / monthsLeft

  let pace: GoalPace = 'no-data'
  if (totalSaved >= goal.target_amount) {
    pace = 'complete'
  } else if (contributions.length > 0) {
    const totalDays  = Math.max(1, differenceInDays(targetDate, createdAt))
    const daysPassed = Math.max(1, differenceInDays(now, createdAt))
    const expected   = (goal.target_amount / totalDays) * daysPassed
    const ratio      = totalSaved / expected
    pace = ratio >= 1.1 ? 'ahead' : ratio >= 0.85 ? 'on-track' : 'behind'
  }

  return { ...goal, totalSaved, remaining, percentSaved, daysLeft, pace, avgPerMonth, neededPerMonth, contributions }
}

export default async function BudgetsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch everything in parallel
  const [
    { data: budgets },
    { data: goals },
    { data: allContributions },
  ] = await Promise.all([
    supabase.from('budgets').select('*').eq('user_id', user!.id).eq('is_active', true).order('created_at', { ascending: true }),
    supabase.from('goals').select('*').eq('user_id', user!.id).order('created_at', { ascending: true }),
    supabase.from('goal_contributions').select('*').eq('user_id', user!.id).order('date', { ascending: false }),
  ])

  // Compute spend per budget
  const budgetsWithSpend: BudgetWithSpend[] = await Promise.all(
    (budgets ?? []).map(async (budget) => {
      const { start, end } = getPeriodRange(budget.period)
      let query = supabase.from('transactions').select('amount').eq('user_id', user!.id).gte('date', start).lte('date', end)
      if (budget.category) query = query.eq('category', budget.category)
      if (budget.merchant)  query = query.ilike('merchant', `%${budget.merchant}%`)
      const { data: txns } = await query
      const spent = (txns ?? []).reduce((sum, t) => sum + Number(t.amount), 0)
      const pct   = budget.amount > 0 ? (spent / budget.amount) * 100 : 0
      return {
        ...budget, spent, periodStart: start, periodEnd: end,
        remaining: budget.amount - spent, percentUsed: pct,
        status: spent === 0 ? 'no-activity' : spent > budget.amount ? 'over' : pct >= 80 ? 'warning' : 'on-track',
      } satisfies BudgetWithSpend
    })
  )

  const goalsWithProgress: GoalWithProgress[] = (goals ?? []).map((g) => {
    const contribs = (allContributions ?? []).filter((c) => c.goal_id === g.id) as GoalContribution[]
    return buildGoalWithProgress(g, contribs)
  })

  return (
    <BudgetsClient
      initialBudgets={budgetsWithSpend}
      initialGoals={goalsWithProgress}
    />
  )
}
