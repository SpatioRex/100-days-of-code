import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { differenceInDays, differenceInCalendarMonths } from 'date-fns'
import type { GoalWithProgress, GoalContribution, GoalPace } from '@/types/database'
import { getUserPlan, PLAN_LIMITS, isAtLimit, upgradeRequired } from '@/lib/subscription'

function buildGoalWithProgress(
  goal: { id: string; user_id: string; name: string; target_amount: number; target_date: string; emoji: string; created_at: string },
  contributions: GoalContribution[]
): GoalWithProgress {
  const totalSaved  = contributions.reduce((s, c) => s + Number(c.amount), 0)
  const remaining   = Math.max(0, goal.target_amount - totalSaved)
  const percentSaved = goal.target_amount > 0 ? Math.min(100, (totalSaved / goal.target_amount) * 100) : 0

  const now        = new Date()
  const targetDate = new Date(goal.target_date)
  const createdAt  = new Date(goal.created_at)
  const daysLeft   = Math.max(0, differenceInDays(targetDate, now))

  // Avg per month based on actual saving rate
  const monthsActive = Math.max(1, differenceInCalendarMonths(now, createdAt) + 1)
  const avgPerMonth  = totalSaved / monthsActive

  // How much is needed each month from now to hit the goal
  const monthsLeft      = Math.max(1, differenceInCalendarMonths(targetDate, now) + 1)
  const neededPerMonth  = remaining / monthsLeft

  // Pace: compare expected savings at this point vs actual
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

  return {
    ...goal,
    totalSaved,
    remaining,
    percentSaved,
    daysLeft,
    pace,
    avgPerMonth,
    neededPerMonth,
    contributions,
  }
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: goals, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: allContributions } = await supabase
    .from('goal_contributions')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })

  const goalsWithProgress = (goals ?? []).map((g) => {
    const contribs = (allContributions ?? []).filter((c) => c.goal_id === g.id) as GoalContribution[]
    return buildGoalWithProgress(g, contribs)
  })

  return NextResponse.json({ goals: goalsWithProgress })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const plan = await getUserPlan(user.id, supabase)
  const limit = PLAN_LIMITS[plan].goals

  if (limit === 0) {
    return NextResponse.json(upgradeRequired('goals', 'plus'), { status: 403 })
  }

  if (limit !== Infinity) {
    const { count } = await supabase
      .from('goals')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (isAtLimit(count ?? 0, limit)) {
      return NextResponse.json(upgradeRequired('goals', 'plus'), { status: 403 })
    }
  }

  const body = await req.json()
  const { name, target_amount, target_date, emoji } = body

  if (!name || !target_amount || !target_date) {
    return NextResponse.json({ error: 'name, target_amount, and target_date are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('goals')
    .insert({
      user_id: user.id,
      name,
      target_amount: Number(target_amount),
      target_date,
      emoji: emoji || '🎯',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ goal: buildGoalWithProgress(data, []) }, { status: 201 })
}
