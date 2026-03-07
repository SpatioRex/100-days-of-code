'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const PRICES = {
  plus: { monthly: 10.99, annual: 83, annualPerMonth: 6.92 },
  pro: { monthly: 16.49, annual: 125, annualPerMonth: 10.42 },
}

const PLUS_FEATURES = [
  'Bank sync via Plaid (up to 2 accounts)',
  'Gmail & Yahoo receipt scanning',
  'Receipt uploads (20/month)',
  'Full transaction history',
  'Unlimited budgets & savings goals',
  'Dashboard customization',
  'Email alerts & weekly digest',
  '1 on-demand AI financial report/month',
]

const PRO_FEATURES = [
  'Everything in Plus, plus:',
  'Unlimited bank connections',
  'Unlimited receipt uploads',
  'AI financial reports — weekly / monthly / annual',
  'Custom report builder (11 sections)',
  'Data export — CSV & PDF',
  'Tax export ($4.99/year)',
  'Priority support & early feature access',
]

interface PricingCardProps {
  name: string
  description: string
  monthlyPrice: number
  annualPrice: number
  annualPerMonth: number
  isAnnual: boolean
  features: string[]
  planKey: 'plus' | 'pro'
  highlighted?: boolean
  currentPlan?: boolean
}

function PricingCard({
  name, description, monthlyPrice, annualPrice, annualPerMonth,
  isAnnual, features, planKey, highlighted, currentPlan,
}: PricingCardProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleUpgrade() {
    if (currentPlan) return
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planKey, interval: isAnnual ? 'yearly' : 'monthly' }),
      })
      const { url, error } = await res.json()
      if (error) throw new Error(error)
      router.push(url)
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to start checkout')
      setLoading(false)
    }
  }

  return (
    <div className={cn(
      'rounded-2xl border p-8 flex flex-col gap-6 relative',
      highlighted ? 'border-primary bg-primary/5 shadow-lg' : 'bg-card'
    )}>
      {highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
            Most popular
          </span>
        </div>
      )}

      <div>
        <h2 className="text-xl font-bold">{name}</h2>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>

      <div>
        <div className="flex items-end gap-1">
          <span className="text-4xl font-bold tabular-nums">
            ${isAnnual ? annualPerMonth.toFixed(2) : monthlyPrice.toFixed(2)}
          </span>
          <span className="text-muted-foreground mb-1">/mo</span>
        </div>
        {isAnnual && (
          <p className="text-sm text-muted-foreground mt-1">
            Billed ${annualPrice}/year · <span className="text-green-600 font-medium">save 37%</span>
          </p>
        )}
        {!isAnnual && (
          <p className="text-sm text-muted-foreground mt-1">Billed monthly</p>
        )}
      </div>

      <Button
        className="w-full"
        variant={highlighted ? 'default' : 'outline'}
        disabled={loading || currentPlan}
        onClick={handleUpgrade}
      >
        {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        {currentPlan ? 'Current plan' : `Start with ${name}`}
      </Button>

      <ul className="space-y-3">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm">
            <Check className="h-4 w-4 shrink-0 text-green-500 mt-0.5" />
            <span className={f.startsWith('Everything') ? 'font-medium' : ''}>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(true)

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-16">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Simple, honest pricing</h1>
        <p className="text-muted-foreground">
          Start with a 14-day free trial — no credit card required.
        </p>
      </div>

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setIsAnnual(false)}
          className={cn(
            'text-sm font-medium transition-colors',
            !isAnnual ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Monthly
        </button>
        <button
          onClick={() => setIsAnnual(!isAnnual)}
          className={cn(
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
            isAnnual ? 'bg-primary' : 'bg-muted'
          )}
          role="switch"
          aria-checked={isAnnual}
        >
          <span className={cn(
            'inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
            isAnnual ? 'translate-x-6' : 'translate-x-1'
          )} />
        </button>
        <button
          onClick={() => setIsAnnual(true)}
          className={cn(
            'flex items-center gap-1.5 text-sm font-medium transition-colors',
            isAnnual ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Annual
          <span className="text-xs bg-green-500/15 text-green-700 px-1.5 py-0.5 rounded-full font-semibold">
            Save 37%
          </span>
        </button>
      </div>

      {/* Pricing cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <PricingCard
          name="Plus"
          description="Everything you need to understand your finances."
          monthlyPrice={PRICES.plus.monthly}
          annualPrice={PRICES.plus.annual}
          annualPerMonth={PRICES.plus.annualPerMonth}
          isAnnual={isAnnual}
          features={PLUS_FEATURES}
          planKey="plus"
          highlighted
        />
        <PricingCard
          name="Pro"
          description="For power users who want full control and insights."
          monthlyPrice={PRICES.pro.monthly}
          annualPrice={PRICES.pro.annual}
          annualPerMonth={PRICES.pro.annualPerMonth}
          isAnnual={isAnnual}
          features={PRO_FEATURES}
          planKey="pro"
        />
      </div>

      {/* Trial callout */}
      <div className="text-center rounded-xl border border-dashed p-6 space-y-2">
        <p className="font-medium">Not ready to commit?</p>
        <p className="text-sm text-muted-foreground">
          Your free trial gives you full Plus access for 14 days — no credit card required.
          Your data is never deleted.
        </p>
      </div>

      {/* FAQ */}
      <div className="space-y-4 max-w-2xl mx-auto">
        <h2 className="text-lg font-semibold">Common questions</h2>
        <div className="space-y-4 text-sm">
          {[
            {
              q: 'What happens when my trial ends?',
              a: 'Your account switches to view-only mode — you can still see your data, but bank syncing, receipt uploads, and email alerts pause until you upgrade.',
            },
            {
              q: 'Can I cancel anytime?',
              a: 'Yes. Cancel from the Billing section in Settings. Your plan stays active through the end of the billing period.',
            },
            {
              q: 'What payment methods do you accept?',
              a: 'All major credit and debit cards via Stripe. Payments are processed securely — we never store card details.',
            },
            {
              q: 'Is my data safe?',
              a: 'Yes. All data is encrypted at rest and in transit. We use Plaid for bank connections — we never see your bank credentials.',
            },
          ].map(({ q, a }) => (
            <div key={q} className="border rounded-lg p-4">
              <p className="font-medium mb-1">{q}</p>
              <p className="text-muted-foreground">{a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
