import type { SupabaseClient } from '@supabase/supabase-js'

export const PLAN_LIMITS = {
  trial: {
    bankConnections: 2,
    receiptUploadsPerMonth: 20,
    budgets: Infinity,
    goals: Infinity,
    historyDays: Infinity,
    emailNotifications: true,
    dashboardCustomization: true,
    weeklyDigest: true,
    financialReports: false,
    onDemandReports: 0,
    export: false,
  },
  locked: {
    bankConnections: 0,
    receiptUploadsPerMonth: 0,
    budgets: 0,
    goals: 0,
    historyDays: Infinity, // can VIEW existing data
    emailNotifications: false,
    dashboardCustomization: false,
    weeklyDigest: false,
    financialReports: false,
    onDemandReports: 0,
    export: false,
  },
  plus: {
    bankConnections: 2,
    receiptUploadsPerMonth: 20,
    budgets: Infinity,
    goals: Infinity,
    historyDays: Infinity,
    emailNotifications: true,
    dashboardCustomization: true,
    weeklyDigest: true,
    financialReports: false,
    onDemandReports: 1, // 1 on-demand report/month
    export: false,
  },
  pro: {
    bankConnections: Infinity,
    receiptUploadsPerMonth: Infinity,
    budgets: Infinity,
    goals: Infinity,
    historyDays: Infinity,
    emailNotifications: true,
    dashboardCustomization: true,
    weeklyDigest: true,
    financialReports: true, // scheduled weekly/monthly/annual
    onDemandReports: Infinity,
    export: true,
  },
  pass: {
    bankConnections: 2,
    receiptUploadsPerMonth: 20,
    budgets: Infinity,
    goals: Infinity,
    historyDays: Infinity,
    emailNotifications: true,
    dashboardCustomization: true,
    weeklyDigest: true,
    financialReports: false,
    onDemandReports: 1,
    export: false,
  },
} as const

export type Plan = keyof typeof PLAN_LIMITS

export const TRIAL_DAYS = 14

export interface SubscriptionRow {
  plan: string
  status: string | null
  trial_started_at: string | null
  current_period_end: string | null
}

export function resolvePlan(row: SubscriptionRow | null): Plan {
  if (!row) return 'trial'

  if (row.plan === 'trial') {
    if (!row.trial_started_at) return 'locked'
    const trialEnd = new Date(row.trial_started_at)
    trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS)
    return new Date() < trialEnd ? 'plus' : 'locked'
  }

  if (row.plan === 'locked') return 'locked'

  // Stripe-backed plans
  const validStatuses = ['active', 'trialing']
  if (!validStatuses.includes(row.status ?? '')) return 'locked'
  if (row.current_period_end && new Date(row.current_period_end) < new Date()) return 'locked'

  return row.plan as Plan
}

export async function getUserPlan(
  userId: string,
  supabase: SupabaseClient
): Promise<Plan> {
  const { data } = await supabase
    .from('user_subscriptions')
    .select('plan, status, trial_started_at, current_period_end')
    .eq('user_id', userId)
    .single()

  return resolvePlan(data as SubscriptionRow | null)
}

export function isAtLimit(current: number, limit: number | typeof Infinity): boolean {
  return limit !== Infinity && current >= limit
}

export function getTrialDaysRemaining(trialStartedAt: string): number {
  const start = new Date(trialStartedAt)
  const end = new Date(start)
  end.setDate(end.getDate() + TRIAL_DAYS)
  const ms = end.getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}

/** Returns a 403-compatible error payload for gated routes */
export function upgradeRequired(feature: string, requiredPlan: 'plus' | 'pro') {
  return {
    error: 'upgrade_required',
    feature,
    requiredPlan,
  }
}
