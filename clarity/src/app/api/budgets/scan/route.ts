import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { subDays, format } from 'date-fns'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const days: number = [30, 60, 90].includes(body.days) ? body.days : 30

  const now = new Date()
  const periodStart = format(subDays(now, days), 'yyyy-MM-dd')
  const prevPeriodStart = format(subDays(now, days * 2), 'yyyy-MM-dd')

  // Fetch current and previous period transactions
  const [{ data: current }, { data: previous }] = await Promise.all([
    supabase
      .from('transactions')
      .select('merchant, amount, category, date, is_recurring')
      .eq('user_id', user.id)
      .gte('date', periodStart)
      .order('date', { ascending: false }),
    supabase
      .from('transactions')
      .select('merchant, amount, category, date')
      .eq('user_id', user.id)
      .gte('date', prevPeriodStart)
      .lt('date', periodStart),
  ])

  if (!current?.length) {
    return NextResponse.json({
      error: 'Not enough transaction data to scan. Import some transactions first.',
    }, { status: 400 })
  }

  // Aggregate by category for current and previous period
  const sumByCategory = (txns: { category: string; amount: unknown }[]) => {
    const map: Record<string, number> = {}
    for (const t of txns ?? []) {
      map[t.category] = (map[t.category] ?? 0) + Number(t.amount)
    }
    return map
  }

  const sumByMerchant = (txns: { merchant: string; amount: unknown }[]) => {
    const map: Record<string, number> = {}
    for (const t of txns ?? []) {
      const key = t.merchant.toLowerCase()
      map[key] = (map[key] ?? 0) + Number(t.amount)
    }
    return map
  }

  const currentCats = sumByCategory(current)
  const previousCats = sumByCategory(previous ?? [])
  const currentMerchants = sumByMerchant(current)

  const totalSpent = Object.values(currentCats).reduce((a, b) => a + b, 0)

  // Build a compact summary for Claude
  const prompt = `You are a personal finance advisor analyzing ${days} days of spending data for a user.

CURRENT PERIOD (last ${days} days):
Total spent: $${totalSpent.toFixed(2)}

Spending by category:
${Object.entries(currentCats).map(([cat, amt]) => `  ${cat}: $${amt.toFixed(2)}`).join('\n')}

Top merchants (current period):
${Object.entries(currentMerchants)
  .sort(([, a], [, b]) => b - a)
  .slice(0, 10)
  .map(([m, amt]) => `  ${m}: $${amt.toFixed(2)}`)
  .join('\n')}

PREVIOUS PERIOD (${days * 2} to ${days} days ago):
Spending by category:
${Object.keys(currentCats).map((cat) => {
  const prev = previousCats[cat] ?? 0
  return `  ${cat}: $${prev.toFixed(2)}`
}).join('\n')}

${body.goalAmount && body.goalDays ? `
USER GOAL: Save $${body.goalAmount} over the next ${body.goalDays} days.
Monthly savings needed: $${((Number(body.goalAmount) / Number(body.goalDays)) * 30).toFixed(2)}/month
` : ''}

Analyze the spending and return ONLY a valid JSON object with this exact shape (no markdown, no explanation):
{
  "totalSpent": ${totalSpent.toFixed(2)},
  "periodDays": ${days},
  "topCategories": [
    { "category": "string", "amount": number, "percentOfTotal": number }
  ],
  "movers": [
    { "category": "string", "currentAmount": number, "previousAmount": number, "delta": number, "direction": "up" | "down" }
  ],
  "opportunities": [
    { "title": "string", "description": "string", "estimatedMonthlySavings": number }
  ],
  "goalInsight": "string or null — only if user provided a goal, brief actionable sentence about whether/how they can hit it"
}

Rules:
- topCategories: top 4 by spend, sorted descending
- movers: up to 3 most notable category changes vs previous period (only include if delta > $10)
- opportunities: 2-4 specific, actionable savings suggestions based on the actual data (e.g. specific merchant names, recurring charges, etc.). Be specific, not generic.
- Round all dollar amounts to 2 decimal places
- If previous period data is sparse, skip movers`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text.trim() : ''

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const parsed = JSON.parse(jsonMatch?.[0] ?? text)
    return NextResponse.json({ scan: parsed })
  } catch {
    return NextResponse.json({ error: 'Failed to parse scan results' }, { status: 500 })
  }
}
