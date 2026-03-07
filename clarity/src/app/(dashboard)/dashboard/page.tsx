import { createClient } from '@/lib/supabase/server'
import { SyncAllButton } from '@/components/sync-all-button'
import { DashboardClient } from './dashboard-client'
import type { Transaction } from '@/types/database'
import { format } from 'date-fns'
import { getUserPlan } from '@/lib/subscription'

async function getDashboardData(userId: string) {
  const supabase = await createClient()
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString().split('T')[0]

  const [
    { data: transactions },
    { data: allRecurring },
    { data: gmailConn },
    { data: bankConns },
    { data: prefs },
    { data: budgets },
    { data: goals },
  ] = await Promise.all([
    supabase.from('transactions').select('*').eq('user_id', userId)
      .gte('date', startOfMonth).order('date', { ascending: false }),
    supabase.from('transactions').select('*').eq('user_id', userId)
      .or('recurring_type.eq.subscription,recurring_type.eq.payment,and(is_recurring.eq.true,recurring_type.is.null)')
      .order('date', { ascending: false }),
    supabase.from('gmail_connections').select('id').eq('user_id', userId),
    supabase.from('bank_connections').select('id').eq('user_id', userId),
    supabase.from('user_preferences')
      .select('income_amount, income_week_type, income_source, income_linked_merchant')
      .eq('user_id', userId).single(),
    supabase.from('budgets').select('id').eq('user_id', userId).eq('is_active', true),
    supabase.from('goals').select('id').eq('user_id', userId),
  ])

  const seen = new Set<string>()
  const uniqueRecurring = ((allRecurring as Transaction[] | null) ?? []).filter((t) => {
    const key = t.merchant.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // Auto-resolve income from linked merchant (most recent transaction amount)
  let resolvedIncomeAmount: number | null = prefs?.income_amount ?? null
  let incomeLastTx: { merchant: string; amount: number; date: string } | null = null

  if (prefs?.income_source === 'linked' && prefs?.income_linked_merchant) {
    const { data: latestTx } = await supabase
      .from('transactions')
      .select('merchant, amount, date')
      .eq('user_id', userId)
      .ilike('merchant', `%${prefs.income_linked_merchant.trim()}%`)
      .order('date', { ascending: false })
      .limit(1)
      .single()

    if (latestTx) {
      resolvedIncomeAmount = Number(latestTx.amount)
      incomeLastTx = { merchant: latestTx.merchant, amount: Number(latestTx.amount), date: latestTx.date }
    }
  }

  return {
    transactions:          (transactions as Transaction[] | null) ?? [],
    uniqueRecurring,
    gmailConnected:        (gmailConn?.length ?? 0) > 0,
    gmailCount:            gmailConn?.length ?? 0,
    banksConnected:        (bankConns?.length ?? 0) > 0,
    bankCount:             bankConns?.length ?? 0,
    incomeAmount:          resolvedIncomeAmount,
    incomeWeekType:        (prefs?.income_week_type as '5-day' | '7-day') ?? '5-day',
    incomeSource:          (prefs?.income_source as 'manual' | 'linked') ?? 'manual',
    incomeLinkedMerchant:  prefs?.income_linked_merchant ?? null,
    incomeLastTx,
    budgetCount:           budgets?.length ?? 0,
    goalCount:             goals?.length ?? 0,
  }
}

function getCategoryBreakdown(transactions: Transaction[]) {
  const map: Record<string, number> = {}
  for (const t of transactions) {
    map[t.category] = (map[t.category] ?? 0) + Number(t.amount)
  }
  return Object.entries(map).sort(([, a], [, b]) => b - a)
    .map(([category, amount]) => ({ category, amount }))
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const [
    {
      transactions: txList, uniqueRecurring, gmailConnected, gmailCount,
      banksConnected, bankCount, incomeAmount, incomeWeekType, incomeSource,
      incomeLinkedMerchant, incomeLastTx, budgetCount, goalCount,
    },
    plan,
  ] = await Promise.all([
    getDashboardData(user!.id),
    getUserPlan(user!.id, supabase),
  ])

  const totalSpent = txList.reduce((sum, t) => sum + Number(t.amount), 0)
  const activeSubscriptions = txList.filter((t) => t.recurring_type === 'subscription' || (t.is_recurring && !t.recurring_type)).length
  const categoryBreakdown = getCategoryBreakdown(txList)
  const topCategory = categoryBreakdown[0]?.category ?? '—'
  const recentTransactions = txList.slice(0, 5)
  const month = format(new Date(), 'MMMM yyyy')

  const monthlyOverhead = uniqueRecurring.reduce((sum, t) => sum + Number(t.amount), 0)
  const dailyOverhead = monthlyOverhead / 30
  const yearlyOverhead = monthlyOverhead * 12

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <SyncAllButton hasGmail={gmailConnected} hasBank={banksConnected} />
      </div>
      <DashboardClient data={{
        transactions: txList,
        uniqueRecurring,
        gmailConnected,
        gmailCount,
        banksConnected,
        bankCount,
        totalSpent,
        activeSubscriptions,
        topCategory,
        categoryBreakdown,
        recentTransactions,
        monthlyOverhead,
        dailyOverhead,
        yearlyOverhead,
        month,
        incomeAmount,
        incomeWeekType,
        incomeSource,
        incomeLinkedMerchant,
        incomeLastTx,
        budgetCount,
        goalCount,
        plan,
      }} />
    </div>
  )
}
