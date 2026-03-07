import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CreditCard, DollarSign, Inbox, CalendarDays, TrendingDown } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'
import type { Transaction } from '@/types/database'

// Common fixed payment labels
const PAYMENT_ICONS: Record<string, string> = {
  rent: '🏠',
  mortgage: '🏠',
  car: '🚗',
  auto: '🚗',
  loan: '💳',
  insurance: '🛡️',
  electric: '⚡',
  gas: '🔥',
  water: '💧',
  internet: '🌐',
  phone: '📱',
  gym: '💪',
  tuition: '🎓',
  student: '🎓',
}

function getPaymentIcon(merchant: string): string {
  const lower = merchant.toLowerCase()
  for (const [key, icon] of Object.entries(PAYMENT_ICONS)) {
    if (lower.includes(key)) return icon
  }
  return '💳'
}

export default async function PaymentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: payments } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user!.id)
    .eq('recurring_type', 'payment')
    .order('date', { ascending: false })

  const paymentList = (payments as Transaction[] | null) ?? []

  // Deduplicate by merchant (keep most recent)
  const seen = new Set<string>()
  const unique = paymentList.filter((t) => {
    const key = t.merchant.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const totalMonthly = unique.reduce((sum, t) => sum + Number(t.amount), 0)
  const totalYearly = totalMonthly * 12
  const totalDaily = totalMonthly / 30

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Fixed obligations — rent, loans, insurance, utilities
          </p>
        </div>
      </div>

      {/* Summary */}
      {unique.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-6 flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">${totalMonthly.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Per month</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-3">
              <CalendarDays className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">${totalDaily.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Per day</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-3">
              <TrendingDown className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">${totalYearly.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">Per year</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {unique.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm font-medium">No payments tracked yet</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            Go to{' '}
            <Link href="/transactions" className="underline underline-offset-2">
              Transactions
            </Link>{' '}
            and use the edit button to mark rent, loans, or other fixed payments.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {unique.map((payment) => (
            <PaymentCard key={payment.id} payment={payment} />
          ))}
        </div>
      )}
    </div>
  )
}

function PaymentCard({ payment: p }: { payment: Transaction }) {
  const icon = getPaymentIcon(p.merchant)
  const label = p.custom_label

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-lg">{icon}</span>
              <div className="min-w-0">
                <p className="font-semibold truncate">{p.merchant}</p>
                {label && (
                  <p className="text-xs text-primary truncate">{label}</p>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Last charged {format(new Date(p.date), 'MMM d, yyyy')}
            </p>
          </div>
          <Badge variant="outline" className="ml-2 shrink-0 text-xs">
            <CreditCard className="h-2.5 w-2.5 mr-1" />Fixed
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-xl font-bold">${Number(p.amount).toFixed(2)}</span>
            <span className="text-xs text-muted-foreground ml-1">/mo</span>
          </div>
          <p className="text-xs text-muted-foreground">
            ${(Number(p.amount) * 12).toFixed(0)}/yr
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
