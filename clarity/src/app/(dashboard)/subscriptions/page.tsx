import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, ExternalLink, Inbox } from 'lucide-react'
import { format } from 'date-fns'
import type { Transaction } from '@/types/database'

export default async function SubscriptionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: subscriptions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user!.id)
    .eq('is_recurring', true)
    .order('date', { ascending: false })

  const subList = (subscriptions as Transaction[] | null) ?? []

  // Deduplicate by merchant (keep most recent)
  const seen = new Set<string>()
  const unique = subList.filter((t) => {
    const key = t.merchant.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const totalMonthly = unique.reduce((sum, t) => sum + Number(t.amount), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Subscriptions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {unique.length} active subscription{unique.length !== 1 ? 's' : ''} ·{' '}
            <span className="font-medium text-foreground">
              ${totalMonthly.toFixed(2)}/mo
            </span>
          </p>
        </div>
      </div>

      {unique.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm font-medium">No subscriptions detected yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Connect Gmail or upload receipts — Claude will identify recurring charges automatically
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {unique.map((sub) => (
            <SubscriptionCard key={sub.id} subscription={sub} />
          ))}
        </div>
      )}
    </div>
  )
}

function SubscriptionCard({ subscription: sub }: { subscription: Transaction }) {
  const cancelUrl = `https://www.google.com/search?q=how+to+cancel+${encodeURIComponent(sub.merchant)}+subscription`

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0">
            <p className="font-semibold truncate">{sub.merchant}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Last charged {format(new Date(sub.date), 'MMM d, yyyy')}
            </p>
          </div>
          <Badge variant="secondary" className="ml-2 shrink-0">
            <RefreshCw className="h-3 w-3 mr-1" />
            Recurring
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-xl font-bold">
              ${Number(sub.amount).toFixed(2)}
            </span>
            <span className="text-xs text-muted-foreground ml-1">{sub.category}</span>
          </div>
          <a href={cancelUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <ExternalLink className="h-3 w-3" />
              How to Cancel
            </Button>
          </a>
        </div>
      </CardContent>
    </Card>
  )
}
