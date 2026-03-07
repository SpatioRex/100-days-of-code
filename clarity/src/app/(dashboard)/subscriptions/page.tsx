import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, ExternalLink, Inbox, DollarSign } from 'lucide-react'
import { format } from 'date-fns'
import type { Transaction } from '@/types/database'

// Direct cancel URLs for 50+ popular services
const CANCEL_URLS: Record<string, string> = {
  netflix: 'https://www.netflix.com/cancelplan',
  spotify: 'https://www.spotify.com/account/subscription/cancel',
  hulu: 'https://secure.hulu.com/account/cancel',
  'amazon prime': 'https://www.amazon.com/gp/primecentral',
  'apple music': 'https://support.apple.com/en-us/HT202039',
  'apple tv': 'https://support.apple.com/en-us/HT202039',
  'apple one': 'https://support.apple.com/en-us/HT202039',
  icloud: 'https://support.apple.com/en-us/HT207594',
  'youtube premium': 'https://www.youtube.com/paid_memberships',
  'youtube tv': 'https://tv.youtube.com/settings/membership',
  'disney+': 'https://www.disneyplus.com/account/subscription',
  'disney plus': 'https://www.disneyplus.com/account/subscription',
  'hbo max': 'https://www.max.com/settings/subscription',
  max: 'https://www.max.com/settings/subscription',
  paramount: 'https://www.paramountplus.com/account/',
  peacock: 'https://www.peacocktv.com/account',
  'espn+': 'https://www.espnplus.com/account',
  crunchyroll: 'https://www.crunchyroll.com/settings/subscription',
  'microsoft 365': 'https://account.microsoft.com/services',
  microsoft: 'https://account.microsoft.com/services',
  adobe: 'https://account.adobe.com/plans',
  dropbox: 'https://www.dropbox.com/account/plan',
  'google one': 'https://one.google.com/storage',
  notion: 'https://www.notion.so/profile/settings',
  slack: 'https://slack.com/intl/en-us/help/articles/214908388',
  zoom: 'https://zoom.us/billing',
  github: 'https://github.com/settings/billing',
  figma: 'https://www.figma.com/settings#plan',
  canva: 'https://www.canva.com/settings/billing',
  grammarly: 'https://account.grammarly.com/subscription',
  duolingo: 'https://www.duolingo.com/settings/super',
  headspace: 'https://www.headspace.com/settings',
  calm: 'https://account.calm.com/',
  'new york times': 'https://myaccount.nytimes.com/seg/subscription',
  nytimes: 'https://myaccount.nytimes.com/seg/subscription',
  audible: 'https://www.audible.com/account/membership-detail',
  'ps plus': 'https://store.playstation.com/en-us/subscriptions',
  playstation: 'https://store.playstation.com/en-us/subscriptions',
  'xbox game pass': 'https://account.microsoft.com/services',
  xbox: 'https://account.microsoft.com/services',
  nintendo: 'https://accounts.nintendo.com/setting',
  nordvpn: 'https://my.nordvpn.com/subscription',
  expressvpn: 'https://www.expressvpn.com/support/account',
  '1password': 'https://start.1password.com/sign-in',
  lastpass: 'https://lastpass.com/getpremium.php',
  chatgpt: 'https://chat.openai.com/my-account/billing',
  openai: 'https://platform.openai.com/account/billing',
  midjourney: 'https://www.midjourney.com/account/',
  cursor: 'https://www.cursor.com/settings',
  linear: 'https://linear.app/settings/billing',
  vercel: 'https://vercel.com/account/billing',
}

function getCancelUrl(merchant: string): string | null {
  const lower = merchant.toLowerCase()
  for (const [key, url] of Object.entries(CANCEL_URLS)) {
    if (lower.includes(key)) return url
  }
  return null
}

export default async function SubscriptionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: subscriptions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user!.id)
    .or('recurring_type.eq.subscription,and(is_recurring.eq.true,recurring_type.is.null)')
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
  const withDirectCancel = unique.filter((t) => getCancelUrl(t.merchant))

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Subscriptions</h1>
          <p className="text-sm text-muted-foreground mt-1">Recurring charges detected in your accounts</p>
        </div>
      </div>

      {/* Summary */}
      {unique.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-6 flex items-center gap-3">
              <RefreshCw className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{unique.length}</p>
                <p className="text-xs text-muted-foreground">Active subscriptions</p>
              </div>
            </CardContent>
          </Card>
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
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">${(totalMonthly * 12).toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">Per year</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {unique.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm font-medium">No subscriptions detected yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Connect Gmail or your bank — Claude will identify recurring charges automatically
          </p>
        </div>
      ) : (
        <>
          {withDirectCancel.length > 0 && (
            <p className="text-xs text-muted-foreground">
              ✦ {withDirectCancel.length} subscription{withDirectCancel.length !== 1 ? 's' : ''} have a direct cancel link
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {unique.map((sub) => (
              <SubscriptionCard key={sub.id} subscription={sub} cancelUrl={getCancelUrl(sub.merchant)} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function SubscriptionCard({ subscription: sub, cancelUrl }: { subscription: Transaction; cancelUrl: string | null }) {
  const searchUrl = `https://www.google.com/search?q=how+to+cancel+${encodeURIComponent(sub.merchant)}+subscription`

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0 flex-1">
            <p className="font-semibold truncate">{sub.merchant}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Last charged {format(new Date(sub.date), 'MMM d, yyyy')}
            </p>
          </div>
          <Badge variant="secondary" className="ml-2 shrink-0 text-xs">
            <RefreshCw className="h-2.5 w-2.5 mr-1" />Recurring
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-xl font-bold">${Number(sub.amount).toFixed(2)}</span>
            <span className="text-xs text-muted-foreground ml-1">/mo</span>
          </div>
          <a href={cancelUrl ?? searchUrl} target="_blank" rel="noopener noreferrer">
            <Button
              variant={cancelUrl ? 'destructive' : 'outline'}
              size="sm"
              className="gap-1.5 text-xs h-8"
            >
              <ExternalLink className="h-3 w-3" />
              {cancelUrl ? 'Cancel Now' : 'How to Cancel'}
            </Button>
          </a>
        </div>
      </CardContent>
    </Card>
  )
}
