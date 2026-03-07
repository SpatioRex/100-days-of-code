import Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export type ReportTemplate =
  | 'budget_tracker'
  | 'subscription_watcher'
  | 'savings_coach'
  | 'full_clarity'
  | 'custom'

export type ReportPeriod = 'weekly' | 'monthly' | 'annual' | 'custom'

export interface ReportSection {
  key: string
  title: string
  data: Record<string, unknown>
  narrative?: string
}

export interface GeneratedReport {
  period: ReportPeriod
  periodStart: string
  periodEnd: string
  template: ReportTemplate
  healthScore?: number  // 0-100, for full_clarity and custom (if section enabled)
  sections: ReportSection[]
  summary?: string  // plain-English AI paragraph
  generatedAt: string
}

interface PeriodData {
  startDate: string
  endDate: string
  transactions: Array<{ merchant: string; amount: number; category: string; date: string; is_recurring: boolean; recurring_type: string | null }>
  budgets: Array<{ name: string; category: string | null; amount: number; period: string }>
  goals: Array<{ name: string; target_amount: number; target_date: string; total_saved: number }>
  totalSpent: number
  categoryBreakdown: Record<string, number>
  subscriptions: Array<{ merchant: string; amount: number }>
  incomeAmount: number | null
}

async function fetchPeriodData(
  userId: string,
  supabase: SupabaseClient,
  startDate: string,
  endDate: string
): Promise<PeriodData> {
  const [
    { data: txns },
    { data: budgets },
    { data: goals },
    { data: goalContribs },
    { data: prefs },
  ] = await Promise.all([
    supabase.from('transactions').select('merchant, amount, category, date, is_recurring, recurring_type')
      .eq('user_id', userId).gte('date', startDate).lte('date', endDate),
    supabase.from('budgets').select('name, category, merchant, amount, period').eq('user_id', userId).eq('is_active', true),
    supabase.from('goals').select('id, name, target_amount, target_date').eq('user_id', userId),
    supabase.from('goal_contributions').select('goal_id, amount').eq('user_id', userId),
    supabase.from('user_preferences').select('income_amount').eq('user_id', userId).single(),
  ])

  const txList = (txns ?? []).map(t => ({
    ...t,
    amount: Number(t.amount),
  }))

  const categoryBreakdown: Record<string, number> = {}
  for (const t of txList) {
    categoryBreakdown[t.category] = (categoryBreakdown[t.category] ?? 0) + t.amount
  }

  const totalSpent = txList.reduce((s, t) => s + t.amount, 0)

  const subscriptions = txList.filter(t =>
    t.recurring_type === 'subscription' || (t.is_recurring && !t.recurring_type)
  )
  const uniqueSubs = Object.values(
    subscriptions.reduce((acc, t) => {
      const k = t.merchant.toLowerCase()
      acc[k] = acc[k] ?? { merchant: t.merchant, amount: t.amount }
      return acc
    }, {} as Record<string, { merchant: string; amount: number }>)
  )

  const contribsByGoal = (goalContribs ?? []).reduce((acc, c) => {
    acc[c.goal_id] = (acc[c.goal_id] ?? 0) + Number(c.amount)
    return acc
  }, {} as Record<string, number>)

  const goalsWithProgress = (goals ?? []).map(g => ({
    name: g.name,
    target_amount: Number(g.target_amount),
    target_date: g.target_date,
    total_saved: contribsByGoal[g.id] ?? 0,
  }))

  return {
    startDate,
    endDate,
    transactions: txList,
    budgets: budgets ?? [],
    goals: goalsWithProgress,
    totalSpent,
    categoryBreakdown,
    subscriptions: uniqueSubs,
    incomeAmount: prefs?.income_amount ? Number(prefs.income_amount) : null,
  }
}

function buildPrompt(data: PeriodData, template: ReportTemplate, customSections?: string[]): string {
  const topCategories = Object.entries(data.categoryBreakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([cat, amt]) => `${cat}: $${amt.toFixed(2)}`)
    .join(', ')

  const savingsRate = data.incomeAmount && data.incomeAmount > 0
    ? ((data.incomeAmount - data.totalSpent) / data.incomeAmount * 100).toFixed(1)
    : 'unknown'

  const context = JSON.stringify({
    period: `${data.startDate} to ${data.endDate}`,
    totalSpent: data.totalSpent.toFixed(2),
    income: data.incomeAmount?.toFixed(2) ?? 'not set',
    savingsRate: `${savingsRate}%`,
    topCategories,
    transactionCount: data.transactions.length,
    subscriptions: data.subscriptions.slice(0, 15).map(s => `${s.merchant}: $${s.amount.toFixed(2)}`).join(', '),
    budgets: data.budgets.slice(0, 10).map(b => `${b.name} ($${b.amount}/${b.period})`).join(', '),
    goals: data.goals.slice(0, 8).map(g =>
      `${g.name}: saved $${g.total_saved.toFixed(0)} of $${g.target_amount.toFixed(0)} (${(g.total_saved / g.target_amount * 100).toFixed(0)}%)`
    ).join(', '),
  })

  const templateInstructions: Record<ReportTemplate, string> = {
    budget_tracker: 'Focus on budget performance: spending vs limits per category, over/under %, biggest splurge, week-over-week patterns.',
    subscription_watcher: 'Focus on subscriptions: list all active ones, flag potential "leaks" (under $10/month recurring), total monthly commitment.',
    savings_coach: 'Focus on savings: income vs spending (savings rate), goal pace + projected completion dates, daily burn rate.',
    full_clarity: 'Generate a comprehensive report covering: budget performance, subscription summary, savings goals, top merchants, financial health score (0-100), and a plain-English summary paragraph.',
    custom: `Generate insights for these sections: ${(customSections ?? []).join(', ')}.`,
  }

  return `You are a financial analyst AI generating a personal finance report. Be concise, specific, and actionable.

Financial data for this period:
${context}

Instructions: ${templateInstructions[template]}

Return a JSON object with this structure:
{
  "healthScore": <number 0-100, only for full_clarity or if requested>,
  "sections": [
    {
      "key": "<section_key>",
      "title": "<display title>",
      "narrative": "<2-4 sentences of insight, specific to the numbers>"
    }
  ],
  "summary": "<1 paragraph plain-English summary of the user's financial situation>"
}

Be specific — reference actual dollar amounts, percentages, and merchant names from the data. Do not make up information not in the data.`
}

export async function generateReport(
  userId: string,
  supabase: SupabaseClient,
  options: {
    period: ReportPeriod
    template: ReportTemplate
    periodStart?: string
    periodEnd?: string
    customSections?: string[]
  }
): Promise<GeneratedReport> {
  const now = new Date()

  let startDate: string
  let endDate: string

  if (options.period === 'custom' && options.periodStart && options.periodEnd) {
    startDate = options.periodStart
    endDate = options.periodEnd
  } else if (options.period === 'weekly') {
    const start = new Date(now)
    start.setDate(start.getDate() - 7)
    startDate = format(start, 'yyyy-MM-dd')
    endDate = format(now, 'yyyy-MM-dd')
  } else if (options.period === 'annual') {
    startDate = format(new Date(now.getFullYear(), 0, 1), 'yyyy-MM-dd')
    endDate = format(now, 'yyyy-MM-dd')
  } else {
    // monthly (default)
    const prevMonth = subMonths(now, 1)
    startDate = format(startOfMonth(prevMonth), 'yyyy-MM-dd')
    endDate = format(endOfMonth(prevMonth), 'yyyy-MM-dd')
  }

  const data = await fetchPeriodData(userId, supabase, startDate, endDate)
  const prompt = buildPrompt(data, options.template, options.customSections)

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''

  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  let parsed: { healthScore?: number; sections?: ReportSection[]; summary?: string } = {}
  if (jsonMatch) {
    try { parsed = JSON.parse(jsonMatch[0]) } catch { /* use empty */ }
  }

  return {
    period: options.period,
    periodStart: startDate,
    periodEnd: endDate,
    template: options.template,
    healthScore: parsed.healthScore,
    sections: parsed.sections ?? [],
    summary: parsed.summary,
    generatedAt: now.toISOString(),
  }
}
