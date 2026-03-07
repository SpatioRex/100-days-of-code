'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { CreditCard, Loader2 } from 'lucide-react'
import { PlanBadge } from '@/components/plan-badge'
import { toast } from 'sonner'
import type { Plan } from '@/lib/subscription'
import { getTrialDaysRemaining } from '@/lib/subscription'
import { format } from 'date-fns'

interface BillingCardProps {
  plan: Plan
  rawPlan: string | null
  trialStartedAt: string | null
  currentPeriodEnd: string | null
  hasStripeSubscription: boolean
}

export function BillingCard({
  plan,
  rawPlan,
  trialStartedAt,
  currentPeriodEnd,
  hasStripeSubscription,
}: BillingCardProps) {
  const router = useRouter()
  const [loadingPortal, setLoadingPortal] = useState(false)
  const [loadingCheckout, setLoadingCheckout] = useState(false)

  const isTrial = rawPlan === 'trial'
  const isLocked = rawPlan === 'locked'
  const trialDaysLeft = trialStartedAt ? getTrialDaysRemaining(trialStartedAt) : 0

  // Badge plan: show 'trial' badge for active trial users, 'locked' for expired
  const badgePlan: Plan = isTrial ? 'trial' : isLocked ? 'locked' : plan

  async function handleManageBilling() {
    setLoadingPortal(true)
    try {
      const res = await fetch('/api/stripe/create-portal-session', { method: 'POST' })
      const { url, error } = await res.json()
      if (error) throw new Error(error)
      router.push(url)
    } catch {
      toast.error('Failed to open billing portal')
      setLoadingPortal(false)
    }
  }

  async function handleUpgrade(plan: 'plus' | 'pro') {
    setLoadingCheckout(true)
    try {
      router.push(`/pricing?highlight=${plan}`)
    } finally {
      setLoadingCheckout(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CreditCard className="h-4 w-4" />Billing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current plan */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Current plan</p>
            {isTrial && trialDaysLeft > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Trial ends in {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''}
              </p>
            )}
            {isLocked && (
              <p className="text-xs text-destructive mt-0.5">
                Trial expired — upgrade to continue syncing
              </p>
            )}
            {!isTrial && !isLocked && (plan === 'plus' || plan === 'pro' || plan === 'pass') && currentPeriodEnd && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Renews {format(new Date(currentPeriodEnd), 'MMM d, yyyy')}
              </p>
            )}
          </div>
          <PlanBadge plan={badgePlan} />
        </div>

        {/* Actions */}
        {plan !== 'pro' && plan !== 'pass' && (
          <>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  {plan === 'plus' && !isTrial ? 'Upgrade to Pro' : 'Upgrade your plan'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {plan === 'plus' && !isTrial
                    ? 'Unlimited banks, AI reports, and data export'
                    : 'Get bank sync, budgets, goals, and more'}
                </p>
              </div>
              <Button
                size="sm"
                disabled={loadingCheckout}
                onClick={() => handleUpgrade(plan === 'plus' && !isTrial ? 'pro' : 'plus')}
              >
                {loadingCheckout && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                {plan === 'plus' && !isTrial ? 'Upgrade to Pro' : 'See plans'}
              </Button>
            </div>
          </>
        )}

        {hasStripeSubscription && (
          <>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Manage subscription</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Update payment method, cancel, or change plan
                </p>
              </div>
              <Button variant="outline" size="sm" disabled={loadingPortal} onClick={handleManageBilling}>
                {loadingPortal && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                Manage
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
