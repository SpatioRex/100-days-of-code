'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const FEATURE_COPY: Record<string, { title: string; description: string }> = {
  bank_connections: {
    title: 'Bank sync requires Plus',
    description: 'Connect your bank accounts and see all your transactions automatically.',
  },
  receipt_upload: {
    title: 'Receipt uploads require Plus',
    description: 'Upload receipts and invoices to track spending not captured by your bank.',
  },
  budgets: {
    title: 'Unlimited budgets require Plus',
    description: 'Create as many budgets as you need to track your spending.',
  },
  goals: {
    title: 'Unlimited goals require Plus',
    description: 'Set and track as many savings goals as you want.',
  },
  email_notifications: {
    title: 'Email alerts require Plus',
    description: 'Get notified of large transactions and new subscriptions by email.',
  },
  dashboard_customization: {
    title: 'Dashboard customization requires Plus',
    description: 'Drag and reorder your dashboard widgets.',
  },
  financial_reports: {
    title: 'AI financial reports require Pro',
    description: 'Get weekly, monthly, and annual AI-generated financial insights.',
  },
  export: {
    title: 'Data export requires Pro',
    description: 'Export your transactions as CSV or PDF for tax or analysis purposes.',
  },
}

interface UpgradePromptProps {
  feature: string
  requiredPlan: 'plus' | 'pro'
  /** Render as a full-screen modal blocker instead of inline banner */
  modal?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function UpgradePrompt({
  feature,
  requiredPlan,
  modal = false,
  open,
  onOpenChange,
}: UpgradePromptProps) {
  const router = useRouter()
  const copy = FEATURE_COPY[feature] ?? {
    title: `This feature requires ${requiredPlan === 'pro' ? 'Pro' : 'Plus'}`,
    description: 'Upgrade to unlock this feature.',
  }

  const planLabel = requiredPlan === 'pro' ? 'Pro' : 'Plus'

  function handleUpgrade() {
    router.push(`/pricing?highlight=${requiredPlan}`)
  }

  if (modal) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <DialogTitle>{copy.title}</DialogTitle>
            </div>
            <DialogDescription>{copy.description}</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={handleUpgrade}>
              Upgrade to {planLabel}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange?.(false)}>
              Not now
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
      <Lock className="h-4 w-4 shrink-0" />
      <span className="flex-1">{copy.title}</span>
      <Button size="sm" variant="outline" onClick={handleUpgrade}>
        Upgrade →
      </Button>
    </div>
  )
}

/** Hook to show an upgrade modal when a 403 upgrade_required response is received */
export function useUpgradePrompt() {
  const [state, setState] = useState<{
    open: boolean
    feature: string
    requiredPlan: 'plus' | 'pro'
  }>({ open: false, feature: '', requiredPlan: 'plus' })

  function trigger(feature: string, requiredPlan: 'plus' | 'pro') {
    setState({ open: true, feature, requiredPlan })
  }

  function close() {
    setState((s) => ({ ...s, open: false }))
  }

  return { state, trigger, close }
}
