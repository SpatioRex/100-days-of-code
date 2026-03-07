import { cn } from '@/lib/utils'
import type { Plan } from '@/lib/subscription'

const CONFIG: Record<Plan, { label: string; className: string }> = {
  trial: {
    label: 'Trial',
    className: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  },
  locked: {
    label: 'Locked',
    className: 'bg-muted text-muted-foreground border-border',
  },
  plus: {
    label: 'Plus ✦',
    className: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  },
  pro: {
    label: 'Pro ✦✦',
    className: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
  },
  pass: {
    label: 'Pass ✦',
    className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  },
}

interface PlanBadgeProps {
  plan: Plan
  className?: string
}

export function PlanBadge({ plan, className }: PlanBadgeProps) {
  const { label, className: colorClass } = CONFIG[plan]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
        colorClass,
        className
      )}
    >
      {label}
    </span>
  )
}
