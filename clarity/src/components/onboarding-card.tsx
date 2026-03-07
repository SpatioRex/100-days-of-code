'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PlaidLinkButton } from '@/components/plaid-link-button'
import { CheckCircle2, Circle, Building2, Mail, ScanLine, Sparkles, Plus } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface OnboardingStep {
  id: string
  icon: React.ReactNode
  title: string
  description: string
  done: boolean
  action: React.ReactNode
  addMore?: React.ReactNode  // secondary action shown even when step is done
}

interface OnboardingCardProps {
  bankConnected: boolean
  gmailConnected: boolean
  hasTransactions: boolean
}

export function OnboardingCard({ bankConnected, gmailConnected, hasTransactions }: OnboardingCardProps) {
  const steps: OnboardingStep[] = [
    {
      id: 'bank',
      icon: <Building2 className="h-4 w-4" />,
      title: 'Connect a bank account',
      description: 'Import real transactions automatically via Plaid.',
      done: bankConnected,
      action: <PlaidLinkButton variant="default" className="h-8 text-xs shrink-0" label="Connect bank" />,
      addMore: <PlaidLinkButton variant="outline" className="h-7 text-xs shrink-0 px-2 gap-1" label="+ Add bank" />,
    },
    {
      id: 'gmail',
      icon: <Mail className="h-4 w-4" />,
      title: 'Connect Gmail',
      description: 'Scan receipts and invoices from your inbox.',
      done: gmailConnected,
      action: (
        <Button size="sm" className="h-8 text-xs shrink-0" asChild>
          <Link href="/api/gmail/connect">Connect Gmail</Link>
        </Button>
      ),
      addMore: (
        <Button size="sm" variant="outline" className="h-7 text-xs shrink-0 px-2 gap-1" asChild>
          <Link href="/api/gmail/connect"><Plus className="h-3 w-3" />Add account</Link>
        </Button>
      ),
    },
    {
      id: 'receipt',
      icon: <ScanLine className="h-4 w-4" />,
      title: 'Upload your first receipt',
      description: 'Drop a photo or PDF — Claude reads it instantly.',
      done: hasTransactions,
      action: (
        <Button size="sm" variant="outline" className="h-8 text-xs shrink-0" asChild>
          <Link href="/settings">Upload receipt</Link>
        </Button>
      ),
    },
  ]

  const completedCount = steps.filter(s => s.done).length

  if (completedCount === steps.length) return null

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          Get started with Clarity
          <span className="ml-auto text-xs font-normal text-muted-foreground">
            {completedCount}/{steps.length} done
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {steps.map((step, i) => (
          <div
            key={step.id}
            className={cn(
              'flex items-center gap-3 rounded-lg border bg-background p-3 transition-opacity',
              step.done && 'opacity-50'
            )}
          >
            {/* Step number / check */}
            <div className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
              step.done
                ? 'bg-green-500/10 text-green-600'
                : 'bg-primary/10 text-primary'
            )}>
              {step.done
                ? <CheckCircle2 className="h-4 w-4" />
                : <Circle className="h-4 w-4" />}
            </div>

            {/* Icon + text */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-muted-foreground shrink-0">{step.icon}</span>
              <div className="min-w-0">
                <p className={cn('text-sm font-medium leading-none', step.done && 'line-through text-muted-foreground')}>
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{step.description}</p>
              </div>
            </div>

            {/* Action: primary when not done, addMore when done */}
            {step.done ? step.addMore : step.action}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
