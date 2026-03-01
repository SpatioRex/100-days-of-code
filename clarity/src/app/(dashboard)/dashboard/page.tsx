import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DollarSign,
  Tag,
  RefreshCw,
  TrendingUp,
  ArrowUpRight,
  Inbox,
} from 'lucide-react'
import { format } from 'date-fns'
import type { Transaction } from '@/types/database'

async function getDashboardData(userId: string) {
  const supabase = await createClient()
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0]

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startOfMonth)
    .order('date', { ascending: false })

  return transactions as Transaction[] | null
}

function getCategoryBreakdown(transactions: Transaction[]) {
  const map: Record<string, number> = {}
  for (const t of transactions) {
    map[t.category] = (map[t.category] ?? 0) + Number(t.amount)
  }
  return Object.entries(map)
    .sort(([, a], [, b]) => b - a)
    .map(([category, amount]) => ({ category, amount }))
}

const CATEGORY_COLORS: Record<string, string> = {
  Food: 'bg-orange-500',
  Shopping: 'bg-blue-500',
  Subscriptions: 'bg-purple-500',
  Travel: 'bg-green-500',
  Utilities: 'bg-yellow-500',
  Entertainment: 'bg-pink-500',
  Health: 'bg-teal-500',
  Other: 'bg-slate-500',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const transactions = await getDashboardData(user!.id)
  const txList = transactions ?? []

  const totalSpent = txList.reduce((sum, t) => sum + Number(t.amount), 0)
  const activeSubscriptions = txList.filter((t) => t.is_recurring).length
  const categoryBreakdown = getCategoryBreakdown(txList)
  const topCategory = categoryBreakdown[0]?.category ?? '—'
  const recentTransactions = txList.slice(0, 5)

  const month = format(new Date(), 'MMMM yyyy')

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">{month} overview</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Spent
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalSpent.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Top Category
            </CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{topCategory}</div>
            {topCategory !== '—' && (
              <p className="text-xs text-muted-foreground mt-1">
                ${categoryBreakdown[0]?.amount.toFixed(2)} spent
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Subscriptions
            </CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSubscriptions}</div>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Spending by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              Spending by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categoryBreakdown.length === 0 ? (
              <EmptyState message="No transactions yet this month" />
            ) : (
              <div className="space-y-3">
                {categoryBreakdown.map(({ category, amount }) => {
                  const pct = totalSpent > 0 ? (amount / totalSpent) * 100 : 0
                  return (
                    <div key={category}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{category}</span>
                        <span className="text-sm text-muted-foreground">
                          ${amount.toFixed(2)} · {pct.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-secondary">
                        <div
                          className={`h-2 rounded-full ${CATEGORY_COLORS[category] ?? 'bg-primary'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowUpRight className="h-4 w-4" />
              Recent Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <EmptyState message="No transactions yet. Connect Gmail or upload a receipt to get started." />
            ) : (
              <div className="space-y-3">
                {recentTransactions.map((t) => (
                  <div key={t.id} className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{t.merchant}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(t.date), 'MMM d')} · {t.category}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      {t.is_recurring && (
                        <Badge variant="secondary" className="text-xs">
                          Recurring
                        </Badge>
                      )}
                      <span className="text-sm font-semibold">
                        ${Number(t.amount).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Inbox className="h-8 w-8 text-muted-foreground mb-2" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
