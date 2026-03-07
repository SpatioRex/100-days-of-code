'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, getDaysInMonth, getDate } from 'date-fns'
import {
  Plus, Trash2, Wallet, TrendingUp, TrendingDown,
  Sparkles, Loader2, ChevronRight, AlertTriangle,
  CheckCircle2, MinusCircle, Target, PiggyBank,
  Trophy, Clock, ArrowUpCircle, History, X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import type { BudgetWithSpend, GoalWithProgress, GoalContribution, TransactionCategory } from '@/types/database'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScanResult {
  totalSpent: number
  periodDays: number
  topCategories: { category: string; amount: number; percentOfTotal: number }[]
  movers: { category: string; currentAmount: number; previousAmount: number; delta: number; direction: 'up' | 'down' }[]
  opportunities: { title: string; description: string; estimatedMonthlySavings: number }[]
  goalInsight: string | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: TransactionCategory[] = [
  'Food', 'Shopping', 'Subscriptions', 'Travel',
  'Utilities', 'Entertainment', 'Health', 'Other',
]

const CATEGORY_EMOJI: Record<string, string> = {
  Food: '🍔', Shopping: '🛍️', Subscriptions: '🔄', Travel: '✈️',
  Utilities: '⚡', Entertainment: '🎬', Health: '🏥', Other: '📦',
}

const GOAL_EMOJIS = ['🎯', '🏖️', '🚗', '🏠', '💻', '✈️', '💍', '🎓', '💪', '🐶', '🎸', '⛵']

const BUDGET_STATUS_CONFIG = {
  'on-track':    { label: 'On track',    color: 'text-green-600 dark:text-green-400',   bar: 'bg-green-500',  icon: CheckCircle2 },
  'warning':     { label: 'Approaching', color: 'text-yellow-600 dark:text-yellow-400', bar: 'bg-yellow-500', icon: AlertTriangle },
  'over':        { label: 'Over budget', color: 'text-red-600 dark:text-red-400',        bar: 'bg-red-500',    icon: AlertTriangle },
  'no-activity': { label: 'No activity', color: 'text-muted-foreground',                 bar: 'bg-muted',      icon: MinusCircle },
}

const PACE_CONFIG = {
  'ahead':    { label: 'Ahead of pace',  color: 'text-blue-600 dark:text-blue-400',   icon: TrendingUp },
  'on-track': { label: 'On track',       color: 'text-green-600 dark:text-green-400', icon: CheckCircle2 },
  'behind':   { label: 'Behind pace',    color: 'text-red-600 dark:text-red-400',     icon: TrendingDown },
  'no-data':  { label: 'No contributions yet', color: 'text-muted-foreground',        icon: Clock },
  'complete': { label: 'Goal complete!', color: 'text-green-600 dark:text-green-400', icon: Trophy },
}

const PERIOD_LABELS: Record<string, string> = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' }

// ─── Shared Progress Bar ──────────────────────────────────────────────────────

function ProgressBar({ pct, colorClass }: { pct: number; colorClass: string }) {
  return (
    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
      <div className={`h-full rounded-full transition-all ${colorClass}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  )
}

// ─── Budget Card ──────────────────────────────────────────────────────────────

function BudgetCard({ budget, onDelete }: { budget: BudgetWithSpend; onDelete: (id: string) => void }) {
  const [deleting, setDeleting] = useState(false)
  const cfg = BUDGET_STATUS_CONFIG[budget.status]
  const StatusIcon = cfg.icon

  const daysLabel = (() => {
    const now = new Date()
    if (budget.period === 'daily') return 'today'
    if (budget.period === 'weekly') {
      const end  = new Date(budget.periodEnd)
      const diff = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86400000))
      return `${diff}d left`
    }
    return `${getDaysInMonth(now) - getDate(now)}d left`
  })()

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/budgets/${budget.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      onDelete(budget.id)
      toast.success(`"${budget.name}" deleted`)
    } catch {
      toast.error('Failed to delete budget')
      setDeleting(false)
    }
  }

  return (
    <Card className="relative group">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-base">{budget.category ? CATEGORY_EMOJI[budget.category] ?? '📦' : '💰'}</span>
              <p className="font-semibold text-sm truncate">{budget.name}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              {PERIOD_LABELS[budget.period]}
              {budget.category && ` · ${budget.category}`}
              {budget.merchant && ` · ${budget.merchant}`}
            </p>
          </div>
          <div className="flex items-center gap-1 ml-2 shrink-0">
            <Badge variant="outline" className="text-xs h-5 px-1.5">${budget.amount.toFixed(0)}</Badge>
            <Button
              variant="ghost" size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
              onClick={handleDelete} disabled={deleting}
            >
              {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
            </Button>
          </div>
        </div>
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-xl font-bold">${budget.spent.toFixed(2)}</span>
          <span className="text-xs text-muted-foreground">of ${budget.amount.toFixed(2)}</span>
        </div>
        <ProgressBar pct={budget.percentUsed} colorClass={BUDGET_STATUS_CONFIG[budget.status].bar} />
        <div className="flex items-center justify-between mt-2">
          <div className={`flex items-center gap-1 text-xs font-medium ${cfg.color}`}>
            <StatusIcon className="h-3 w-3" />{cfg.label}
          </div>
          <span className="text-xs text-muted-foreground">
            {budget.remaining >= 0
              ? `$${budget.remaining.toFixed(2)} left · ${daysLabel}`
              : `$${Math.abs(budget.remaining).toFixed(2)} over`}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Goal Card ────────────────────────────────────────────────────────────────

function GoalCard({
  goal,
  onDelete,
  onContribute,
  onDeleteContribution,
}: {
  goal: GoalWithProgress
  onDelete: (id: string) => void
  onContribute: (goalId: string, amount: number, note: string, date: string) => Promise<void>
  onDeleteContribution: (goalId: string, contributionId: string) => Promise<void>
}) {
  const [deleting, setDeleting]         = useState(false)
  const [showContrib, setShowContrib]   = useState(false)
  const [showHistory, setShowHistory]   = useState(false)
  const [amount, setAmount]             = useState('')
  const [note, setNote]                 = useState('')
  const [date, setDate]                 = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving]             = useState(false)

  const pace = PACE_CONFIG[goal.pace]
  const PaceIcon = pace.icon
  const barColor =
    goal.pace === 'complete' ? 'bg-green-500'
    : goal.pace === 'ahead'  ? 'bg-blue-500'
    : goal.pace === 'behind' ? 'bg-red-500'
    : 'bg-primary'

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/goals/${goal.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      onDelete(goal.id)
      toast.success(`"${goal.name}" deleted`)
    } catch {
      toast.error('Failed to delete goal')
      setDeleting(false)
    }
  }

  async function handleContribute(e: React.FormEvent) {
    e.preventDefault()
    if (!amount) return
    setSaving(true)
    try {
      await onContribute(goal.id, parseFloat(amount), note, date)
      setAmount(''); setNote(''); setDate(new Date().toISOString().split('T')[0])
      setShowContrib(false)
      toast.success(`$${parseFloat(amount).toFixed(2)} logged!`)
    } catch {
      toast.error('Failed to log contribution')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Card className="relative group">
        <CardContent className="pt-5 pb-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-lg">{goal.emoji}</span>
                <p className="font-semibold text-sm truncate">{goal.name}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Target: {format(new Date(goal.target_date), 'MMM d, yyyy')}
                {goal.daysLeft > 0 ? ` · ${goal.daysLeft}d left` : ' · Deadline passed'}
              </p>
            </div>
            <Button
              variant="ghost" size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0 ml-2"
              onClick={handleDelete} disabled={deleting}
            >
              {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
            </Button>
          </div>

          {/* Amount */}
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-xl font-bold">${goal.totalSaved.toFixed(2)}</span>
            <span className="text-xs text-muted-foreground">of ${goal.target_amount.toFixed(2)}</span>
          </div>

          {/* Progress */}
          <ProgressBar pct={goal.percentSaved} colorClass={barColor} />

          {/* Pace row */}
          <div className="flex items-center justify-between mt-2 mb-3">
            <div className={`flex items-center gap-1 text-xs font-medium ${pace.color}`}>
              <PaceIcon className="h-3 w-3" />{pace.label}
            </div>
            <span className="text-xs text-muted-foreground">
              {goal.percentSaved.toFixed(0)}% saved
            </span>
          </div>

          {/* Stats row */}
          {goal.pace !== 'no-data' && goal.pace !== 'complete' && (
            <div className="flex justify-between text-xs text-muted-foreground border-t pt-2 mb-3">
              <span>Avg ${goal.avgPerMonth.toFixed(0)}/mo</span>
              <span>Need ${goal.neededPerMonth.toFixed(0)}/mo</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              size="sm" variant="default"
              className="flex-1 h-7 text-xs gap-1"
              onClick={() => setShowContrib(true)}
              disabled={goal.pace === 'complete'}
            >
              <ArrowUpCircle className="h-3 w-3" /> Log contribution
            </Button>
            {goal.contributions.length > 0 && (
              <Button
                size="sm" variant="outline"
                className="h-7 text-xs gap-1 px-2"
                onClick={() => setShowHistory(true)}
              >
                <History className="h-3 w-3" />
                {goal.contributions.length}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Log contribution dialog */}
      <Dialog open={showContrib} onOpenChange={setShowContrib}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{goal.emoji} {goal.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleContribute} className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="contrib-amount">Amount ($)</Label>
              <Input
                id="contrib-amount"
                type="number" min="0.01" step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contrib-date">Date</Label>
              <Input
                id="contrib-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contrib-note">Note <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                id="contrib-note"
                placeholder="e.g. Monthly transfer"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <DialogFooter className="pt-1">
              <Button type="button" variant="outline" onClick={() => setShowContrib(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Contribution history dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-4 w-4" /> Contribution history
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {goal.contributions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No contributions yet</p>
            ) : (
              goal.contributions.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">${Number(c.amount).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(c.date), 'MMM d, yyyy')}
                      {c.note && ` · ${c.note}`}
                    </p>
                  </div>
                  <Button
                    variant="ghost" size="icon"
                    className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => onDeleteContribution(goal.id, c.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))
            )}
          </div>
          <div className="border-t pt-3 flex justify-between text-sm">
            <span className="text-muted-foreground">Total saved</span>
            <span className="font-semibold">${goal.totalSaved.toFixed(2)}</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── Create Budget Modal ──────────────────────────────────────────────────────

function CreateBudgetModal({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated: (b: BudgetWithSpend) => void
}) {
  const [loading, setLoading] = useState(false)
  const [name, setName]       = useState('')
  const [category, setCategory] = useState('all')
  const [merchant, setMerchant] = useState('')
  const [amount, setAmount]   = useState('')
  const [period, setPeriod]   = useState('monthly')

  function reset() { setName(''); setCategory('all'); setMerchant(''); setAmount(''); setPeriod('monthly') }
  function handleClose() { reset(); onClose() }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !amount || !period) return
    setLoading(true)
    try {
      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), category: category === 'all' ? null : category || null, merchant: merchant.trim() || null, amount: parseFloat(amount), period }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      onCreated({ ...data.budget, spent: 0, remaining: data.budget.amount, percentUsed: 0, periodStart: '', periodEnd: '', status: 'no-activity' })
      toast.success(`Budget "${name.trim()}" created!`)
      handleClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally { setLoading(false) }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>New budget</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="bname">Name</Label>
            <Input id="bname" placeholder="e.g. Monthly Groceries" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Period</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bamount">Limit ($)</Label>
              <Input id="bamount" type="number" min="0.01" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Category <span className="text-muted-foreground">(optional)</span></Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="All categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{CATEGORY_EMOJI[c]} {c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bmerchant">Merchant filter <span className="text-muted-foreground">(optional)</span></Label>
            <Input id="bmerchant" placeholder="e.g. Starbucks" value={merchant} onChange={(e) => setMerchant(e.target.value)} />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save budget
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Create Goal Modal ────────────────────────────────────────────────────────

function CreateGoalModal({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated: (g: GoalWithProgress) => void
}) {
  const [loading, setLoading]   = useState(false)
  const [name, setName]         = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [targetDate, setTargetDate]     = useState('')
  const [emoji, setEmoji]       = useState('🎯')

  function reset() { setName(''); setTargetAmount(''); setTargetDate(''); setEmoji('🎯') }
  function handleClose() { reset(); onClose() }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !targetAmount || !targetDate) return
    setLoading(true)
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), target_amount: parseFloat(targetAmount), target_date: targetDate, emoji }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      onCreated(data.goal)
      toast.success(`Goal "${name.trim()}" created!`)
      handleClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally { setLoading(false) }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>New savings goal</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Icon</Label>
            <div className="flex flex-wrap gap-2">
              {GOAL_EMOJIS.map((e) => (
                <button
                  key={e} type="button"
                  onClick={() => setEmoji(e)}
                  className={`text-xl p-1.5 rounded-lg transition-colors ${emoji === e ? 'bg-primary/20 ring-2 ring-primary' : 'hover:bg-muted'}`}
                >{e}</button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gname">Goal name</Label>
            <Input id="gname" placeholder="e.g. Vacation Fund" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="gtarget">Target amount ($)</Label>
              <Input id="gtarget" type="number" min="1" step="0.01" placeholder="0.00" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gdate">Target date</Label>
              <Input id="gdate" type="date" min={new Date().toISOString().split('T')[0]} value={targetDate} onChange={(e) => setTargetDate(e.target.value)} required />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create goal
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Smart Scan ───────────────────────────────────────────────────────────────

function SmartScanCard() {
  const [scanning, setScanning] = useState(false)
  const [days, setDays]         = useState<30 | 60 | 90>(30)
  const [goalAmount, setGoalAmount] = useState('')
  const [goalDays, setGoalDays]     = useState('')
  const [result, setResult]     = useState<ScanResult | null>(null)
  const [error, setError]       = useState<string | null>(null)

  async function handleScan() {
    setScanning(true); setResult(null); setError(null)
    try {
      const res = await fetch('/api/budgets/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days, goalAmount: goalAmount ? parseFloat(goalAmount) : undefined, goalDays: goalDays ? parseInt(goalDays) : undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Scan failed')
      setResult(data.scan)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed')
    } finally { setScanning(false) }
  }

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />Smart Scan
        </CardTitle>
        <p className="text-sm text-muted-foreground">Claude analyses your transactions and surfaces where money could be better used.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Look back</Label>
            <div className="flex rounded-md border overflow-hidden">
              {([30, 60, 90] as const).map((d) => (
                <button key={d} onClick={() => setDays(d)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${days === d ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-accent'}`}>
                  {d}d
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Goal <span className="text-muted-foreground">(optional)</span></Label>
            <div className="flex items-center gap-2">
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                <Input className="pl-6 h-8 w-24 text-xs" placeholder="amount" type="number" min="1" value={goalAmount} onChange={(e) => setGoalAmount(e.target.value)} />
              </div>
              <span className="text-xs text-muted-foreground">in</span>
              <Input className="h-8 w-16 text-xs" placeholder="days" type="number" min="1" value={goalDays} onChange={(e) => setGoalDays(e.target.value)} />
              <span className="text-xs text-muted-foreground">days</span>
            </div>
          </div>
          <Button size="sm" onClick={handleScan} disabled={scanning} className="gap-1.5">
            {scanning ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Scanning…</> : <><Sparkles className="h-3.5 w-3.5" /> Scan now</>}
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {result && (
          <div className="space-y-5 pt-2 border-t">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Last {result.periodDays} days · ${result.totalSpent.toFixed(2)} total</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {result.topCategories.map((c) => (
                  <div key={c.category} className="rounded-lg bg-muted/50 px-3 py-2">
                    <p className="text-xs text-muted-foreground">{CATEGORY_EMOJI[c.category] ?? '📦'} {c.category}</p>
                    <p className="font-semibold text-sm">${c.amount.toFixed(0)}</p>
                    <p className="text-xs text-muted-foreground">{c.percentOfTotal.toFixed(0)}%</p>
                  </div>
                ))}
              </div>
            </div>
            {result.movers.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">📈 vs previous {result.periodDays} days</p>
                <div className="space-y-1.5">
                  {result.movers.map((m) => (
                    <div key={m.category} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{m.category}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground line-through text-xs">${m.previousAmount.toFixed(0)}</span>
                        <span className="font-medium">${m.currentAmount.toFixed(0)}</span>
                        <span className={`flex items-center text-xs font-medium ${m.direction === 'up' ? 'text-red-500' : 'text-green-500'}`}>
                          {m.direction === 'up' ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
                          ${Math.abs(m.delta).toFixed(0)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {result.opportunities.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">💡 Opportunities</p>
                <div className="space-y-2">
                  {result.opportunities.map((o, i) => (
                    <div key={i} className="flex items-start gap-2.5 rounded-lg border bg-muted/30 px-3 py-2.5">
                      <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{o.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{o.description}</p>
                      </div>
                      {o.estimatedMonthlySavings > 0 && (
                        <Badge variant="secondary" className="shrink-0 text-xs">~${o.estimatedMonthlySavings.toFixed(0)}/mo</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {result.goalInsight && (
              <div className="flex items-start gap-2.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
                <Target className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-sm">{result.goalInsight}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Budgets Tab ──────────────────────────────────────────────────────────────

function BudgetsTab({ budgets, onBudgetCreated, onBudgetDeleted }: {
  budgets: BudgetWithSpend[]
  onBudgetCreated: (b: BudgetWithSpend) => void
  onBudgetDeleted: (id: string) => void
}) {
  const [showCreate, setShowCreate] = useState(false)
  const totalBudgeted = budgets.reduce((s, b) => s + b.amount, 0)
  const totalSpent    = budgets.reduce((s, b) => s + b.spent,  0)
  const overallPct    = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0
  const now = new Date()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {format(now, 'MMMM yyyy')} · {getDaysInMonth(now) - getDate(now)} days left
        </p>
        <Button size="sm" className="gap-1.5" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> New budget
        </Button>
      </div>

      {budgets.length > 0 && (
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">${totalSpent.toFixed(2)} spent of ${totalBudgeted.toFixed(2)} budgeted</span>
              </div>
              <span className="text-sm text-muted-foreground">{overallPct.toFixed(0)}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${overallPct > 100 ? 'bg-red-500' : overallPct >= 80 ? 'bg-yellow-500' : 'bg-primary'}`}
                style={{ width: `${Math.min(overallPct, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {budgets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <Wallet className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm font-medium">No budgets yet</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">Track spending against a limit by category, merchant, or both.</p>
          <Button size="sm" className="mt-4 gap-1.5" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> Create your first budget</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {budgets.map((b) => <BudgetCard key={b.id} budget={b} onDelete={onBudgetDeleted} />)}
        </div>
      )}

      <SmartScanCard />
      <CreateBudgetModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={onBudgetCreated} />
    </div>
  )
}

// ─── Goals Tab ────────────────────────────────────────────────────────────────

function GoalsTab({ goals, onGoalCreated, onGoalDeleted, onContributionAdded, onContributionDeleted }: {
  goals: GoalWithProgress[]
  onGoalCreated: (g: GoalWithProgress) => void
  onGoalDeleted: (id: string) => void
  onContributionAdded: (goalId: string, contribution: GoalContribution) => void
  onContributionDeleted: (goalId: string, contributionId: string) => void
}) {
  const [showCreate, setShowCreate] = useState(false)

  const totalSaved  = goals.reduce((s, g) => s + g.totalSaved, 0)
  const totalTarget = goals.reduce((s, g) => s + g.target_amount, 0)

  async function handleContribute(goalId: string, amount: number, note: string, date: string) {
    const res = await fetch(`/api/goals/${goalId}/contribute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, note, date }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    onContributionAdded(goalId, data.contribution)
  }

  async function handleDeleteContribution(goalId: string, contributionId: string) {
    const res = await fetch(`/api/goals/${goalId}/contribute`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contribution_id: contributionId }),
    })
    if (!res.ok) { toast.error('Failed to delete contribution'); return }
    onContributionDeleted(goalId, contributionId)
    toast.success('Contribution removed')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        {goals.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            ${totalSaved.toFixed(2)} saved across {goals.length} goal{goals.length !== 1 ? 's' : ''}
          </p>
        ) : <span />}
        <Button size="sm" className="gap-1.5" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> New goal
        </Button>
      </div>

      {goals.length > 0 && totalTarget > 0 && (
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <PiggyBank className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">${totalSaved.toFixed(2)} saved of ${totalTarget.toFixed(2)} across all goals</span>
              </div>
              <span className="text-sm text-muted-foreground">{((totalSaved / totalTarget) * 100).toFixed(0)}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min((totalSaved / totalTarget) * 100, 100)}%` }} />
            </div>
          </CardContent>
        </Card>
      )}

      {goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <Target className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm font-medium">No savings goals yet</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">Set a target, log contributions, and track whether you&apos;re on pace to hit it.</p>
          <Button size="sm" className="mt-4 gap-1.5" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> Create your first goal</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((g) => (
            <GoalCard
              key={g.id} goal={g}
              onDelete={onGoalDeleted}
              onContribute={handleContribute}
              onDeleteContribution={handleDeleteContribution}
            />
          ))}
        </div>
      )}

      <CreateGoalModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={onGoalCreated} />
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function BudgetsClient({
  initialBudgets,
  initialGoals,
}: {
  initialBudgets: BudgetWithSpend[]
  initialGoals: GoalWithProgress[]
}) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'budgets' | 'goals'>('budgets')
  const [budgets, setBudgets]     = useState(initialBudgets)
  const [goals, setGoals]         = useState(initialGoals)

  // Budget handlers
  function handleBudgetCreated(b: BudgetWithSpend) { setBudgets((p) => [...p, b]); router.refresh() }
  function handleBudgetDeleted(id: string)          { setBudgets((p) => p.filter((b) => b.id !== id)) }

  // Goal handlers
  function handleGoalCreated(g: GoalWithProgress)   { setGoals((p) => [...p, g]) }
  function handleGoalDeleted(id: string)             { setGoals((p) => p.filter((g) => g.id !== id)) }

  function handleContributionAdded(goalId: string, contribution: GoalContribution) {
    setGoals((prev) => prev.map((g) => {
      if (g.id !== goalId) return g
      const contributions = [contribution, ...g.contributions]
      const totalSaved    = contributions.reduce((s, c) => s + Number(c.amount), 0)
      const remaining     = Math.max(0, g.target_amount - totalSaved)
      const percentSaved  = g.target_amount > 0 ? Math.min(100, (totalSaved / g.target_amount) * 100) : 0
      return { ...g, contributions, totalSaved, remaining, percentSaved }
    }))
  }

  function handleContributionDeleted(goalId: string, contributionId: string) {
    setGoals((prev) => prev.map((g) => {
      if (g.id !== goalId) return g
      const contributions = g.contributions.filter((c) => c.id !== contributionId)
      const totalSaved    = contributions.reduce((s, c) => s + Number(c.amount), 0)
      const remaining     = Math.max(0, g.target_amount - totalSaved)
      const percentSaved  = g.target_amount > 0 ? Math.min(100, (totalSaved / g.target_amount) * 100) : 0
      return { ...g, contributions, totalSaved, remaining, percentSaved }
    }))
  }

  const tabBase = 'px-4 py-2 text-sm font-medium border-b-2 transition-colors'
  const tabActive = 'border-primary text-foreground'
  const tabInactive = 'border-transparent text-muted-foreground hover:text-foreground'

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Budgets & Goals</h1>
        <p className="text-sm text-muted-foreground mt-1">Track spending limits and savings progress</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b gap-0 -mb-2">
        <button className={`${tabBase} ${activeTab === 'budgets' ? tabActive : tabInactive}`} onClick={() => setActiveTab('budgets')}>
          <span className="flex items-center gap-2">
            <Wallet className="h-3.5 w-3.5" />
            Budgets
            {budgets.length > 0 && <Badge variant="secondary" className="text-xs h-4 px-1.5 ml-0.5">{budgets.length}</Badge>}
          </span>
        </button>
        <button className={`${tabBase} ${activeTab === 'goals' ? tabActive : tabInactive}`} onClick={() => setActiveTab('goals')}>
          <span className="flex items-center gap-2">
            <Target className="h-3.5 w-3.5" />
            Goals
            {goals.length > 0 && <Badge variant="secondary" className="text-xs h-4 px-1.5 ml-0.5">{goals.length}</Badge>}
          </span>
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'budgets' ? (
        <BudgetsTab
          budgets={budgets}
          onBudgetCreated={handleBudgetCreated}
          onBudgetDeleted={handleBudgetDeleted}
        />
      ) : (
        <GoalsTab
          goals={goals}
          onGoalCreated={handleGoalCreated}
          onGoalDeleted={handleGoalDeleted}
          onContributionAdded={handleContributionAdded}
          onContributionDeleted={handleContributionDeleted}
        />
      )}
    </div>
  )
}
