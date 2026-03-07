'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  DollarSign,
  Tag,
  RefreshCw,
  TrendingUp,
  ArrowUpRight,
  Inbox,
  Mail,
  Building2,
  CheckCircle2,
  CalendarDays,
  CreditCard,
  GripVertical,
  Settings2,
  Loader2,
  HelpCircle,
  Pencil,
  Check,
  X,
  PiggyBank,
} from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { format } from 'date-fns'
import Link from 'next/link'
import { PlaidLinkButton } from '@/components/plaid-link-button'
import { OnboardingCard } from '@/components/onboarding-card'
import type { Transaction } from '@/types/database'
import { toast } from 'sonner'
import type { Plan } from '@/lib/subscription'
import { UpgradePrompt, useUpgradePrompt } from '@/components/upgrade-prompt'

export interface DashboardData {
  transactions: Transaction[]
  uniqueRecurring: Transaction[]
  gmailConnected: boolean
  gmailCount: number
  banksConnected: boolean
  bankCount: number
  totalSpent: number
  activeSubscriptions: number
  topCategory: string
  categoryBreakdown: { category: string; amount: number }[]
  recentTransactions: Transaction[]
  monthlyOverhead: number
  dailyOverhead: number
  yearlyOverhead: number
  month: string
  incomeAmount: number | null
  incomeWeekType: '5-day' | '7-day'
  incomeSource: 'manual' | 'linked'
  incomeLinkedMerchant: string | null
  incomeLastTx: { merchant: string; amount: number; date: string } | null
  budgetCount: number
  goalCount: number
  plan: Plan
}

interface CardConfig {
  id: string
  label: string
  visible: boolean
}

const DEFAULT_CARDS: CardConfig[] = [
  { id: 'connect_accounts', label: 'Connect Accounts', visible: true },
  { id: 'summary',          label: 'Summary Stats',        visible: true },
  { id: 'overhead',         label: 'Overhead',             visible: true },
  { id: 'budgets',          label: 'Budgets & Goals',      visible: true },
  { id: 'categories',       label: 'Spending by Category', visible: true },
  { id: 'recent',           label: 'Recent Transactions',  visible: true },
]

const CATEGORY_COLORS: Record<string, string> = {
  Food: 'bg-orange-500', Shopping: 'bg-blue-500', Subscriptions: 'bg-purple-500',
  Travel: 'bg-green-500', Utilities: 'bg-yellow-500', Entertainment: 'bg-pink-500',
  Health: 'bg-teal-500', Other: 'bg-slate-500',
}

// Sortable card wrapper for customization sheet
function SortableItem({ id, label, visible, onToggle }: {
  id: string; label: string; visible: boolean; onToggle: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 rounded-lg border p-3 bg-background">
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
        <GripVertical className="h-4 w-4" />
      </button>
      <Label className="flex-1 text-sm font-medium cursor-pointer" onClick={onToggle}>
        {label}
      </Label>
      <Switch checked={visible} onCheckedChange={onToggle} />
    </div>
  )
}

// SVG Donut/Ring chart — overhead as a percentage of income
function OverheadDonut({ overhead, income }: { overhead: number; income: number }) {
  const pct     = income > 0 ? Math.min(100, (overhead / income) * 100) : 0
  const isOver  = overhead > income
  const isWarn  = !isOver && pct >= 80
  const r       = 40
  const cx      = 52
  const cy      = 52
  const sw      = 13
  const circ    = 2 * Math.PI * r
  const arc     = circ * (pct / 100)
  const stroke  = isOver ? 'hsl(var(--destructive))' : isWarn ? '#f59e0b' : 'hsl(var(--primary))'

  return (
    <div className="relative inline-flex shrink-0 items-center justify-center">
      <svg width="104" height="104" viewBox="0 0 104 104" style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="hsl(var(--secondary))" strokeWidth={sw} />
        {/* Arc */}
        {pct > 0 && (
          <circle
            cx={cx} cy={cy} r={r} fill="none"
            stroke={stroke}
            strokeWidth={sw}
            strokeDasharray={`${arc} ${circ - arc}`}
            strokeLinecap="butt"
          />
        )}
      </svg>
      <div className="absolute text-center pointer-events-none">
        <p className="text-xl font-bold leading-none tabular-nums">{pct.toFixed(0)}%</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {income <= 0 ? 'no income' : isOver ? 'over income' : 'of income'}
        </p>
      </div>
    </div>
  )
}

export function DashboardClient({ data }: { data: DashboardData }) {
  const [cards, setCards]               = useState<CardConfig[]>(DEFAULT_CARDS)
  const [customizeOpen, setCustomizeOpen] = useState(false)
  const [savingLayout, setSavingLayout] = useState(false)
  const upgradeModal                    = useUpgradePrompt()
  const canCustomize                    = data.plan !== 'locked'

  // Income state — editable inline from the Overhead card
  const [incomeAmt, setIncomeAmt]               = useState<number | null>(data.incomeAmount)
  const [incomeWeekType, setIncomeWeekType]       = useState<'5-day' | '7-day'>(data.incomeWeekType)
  const [incomeSource, setIncomeSource]           = useState<'manual' | 'linked'>(data.incomeSource)
  const [incomeLinkedMerchant, setIncomeLinkedMerchant] = useState<string>(data.incomeLinkedMerchant ?? '')
  const [incomeLastTx, setIncomeLastTx]           = useState(data.incomeLastTx)
  const [editingIncome, setEditingIncome]         = useState(false)
  const [incomeInput, setIncomeInput]             = useState(String(data.incomeAmount ?? ''))
  const [savingIncome, setSavingIncome]           = useState(false)

  // Income computed breakdowns
  const weekDays      = incomeWeekType === '5-day' ? 5 : 7
  const incomeWeekly  = (incomeAmt ?? 0) * 12 / 52
  const incomeDaily   = incomeWeekly / weekDays
  const incomeBiweekly = (incomeAmt ?? 0) * 12 / 26

  // Load saved layout
  useEffect(() => {
    fetch('/api/preferences/dashboard')
      .then(r => r.json())
      .then((saved: CardConfig[]) => {
        if (Array.isArray(saved) && saved.length > 0) {
          const savedIds = new Set(saved.map(c => c.id))
          const defaultById = Object.fromEntries(DEFAULT_CARDS.map(c => [c.id, c]))
          const merged = [
            ...saved.map(c => ({ ...c, label: defaultById[c.id]?.label ?? c.label })),
            ...DEFAULT_CARDS.filter(c => !savedIds.has(c.id)),
          ]
          setCards(merged)
        }
      })
      .catch(() => { /* use defaults */ })
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setCards((items) => {
        const oldIndex = items.findIndex(c => c.id === active.id)
        const newIndex = items.findIndex(c => c.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  function toggleCard(id: string) {
    setCards(prev => prev.map(c => c.id === id ? { ...c, visible: !c.visible } : c))
  }

  async function saveLayout() {
    setSavingLayout(true)
    try {
      const res = await fetch('/api/preferences/dashboard', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cards),
      })
      if (res.ok) {
        toast.success('Dashboard layout saved')
        setCustomizeOpen(false)
      } else {
        toast.error('Failed to save layout')
      }
    } catch {
      toast.error('Failed to save layout')
    } finally {
      setSavingLayout(false)
    }
  }

  async function handleSaveIncome() {
    setSavingIncome(true)
    try {
      const body: Record<string, unknown> = {
        income_week_type: incomeWeekType,
        income_source:    incomeSource,
      }

      if (incomeSource === 'manual') {
        const parsed = Number(incomeInput)
        body.income_amount = parsed > 0 ? parsed : null
        body.income_linked_merchant = null          // clear any previous link
      } else {
        body.income_linked_merchant = incomeLinkedMerchant.trim() || null
        body.income_amount          = Number(incomeInput) > 0 ? Number(incomeInput) : null  // fallback
      }

      const res = await fetch('/api/income', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        const updated = await res.json()
        setIncomeAmt(updated.income_amount ?? null)
        setIncomeSource(updated.income_source ?? 'manual')
        setIncomeLinkedMerchant(updated.income_linked_merchant ?? '')
        setEditingIncome(false)
        // If linked and resolved a transaction, update the lastTx display
        if (updated.income_source === 'linked' && updated.income_amount) {
          setIncomeLastTx(incomeLastTx)  // server already resolved; re-fetch on next load
        }
        toast.success(
          updated.income_source === 'linked'
            ? `Income linked to "${updated.income_linked_merchant}" · $${Number(updated.income_amount ?? 0).toFixed(2)}/mo`
            : 'Income updated'
        )
      } else {
        toast.error('Failed to update income')
      }
    } catch {
      toast.error('Failed to update income')
    } finally {
      setSavingIncome(false)
    }
  }

  const visibleCards = new Set(cards.filter(c => c.visible).map(c => c.id))
  const {
    transactions: txList, gmailConnected, gmailCount, banksConnected, bankCount,
    totalSpent, activeSubscriptions, topCategory, categoryBreakdown, recentTransactions,
    monthlyOverhead, dailyOverhead, yearlyOverhead, month, budgetCount, goalCount,
  } = data
  // incomeAmt/incomeSource etc. are in component state (editable)

  function renderCard(id: string) {
    if (!visibleCards.has(id)) return null

    switch (id) {
      case 'connect_accounts':
        return (
          <Card key={id}>
            <CardHeader>
              <CardTitle className="text-base">Connect Accounts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {/* Bank */}
                <div className="flex items-center justify-between rounded-lg border p-3 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-none">Bank Account</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {banksConnected
                          ? `${bankCount} bank${bankCount !== 1 ? 's' : ''} connected`
                          : 'Import real transactions via Plaid'}
                      </p>
                    </div>
                  </div>
                  {banksConnected ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <PlaidLinkButton variant="outline" className="h-7 text-xs px-2" label="+ Add" />
                    </div>
                  ) : (
                    <PlaidLinkButton variant="default" className="h-8 text-xs shrink-0" label="Connect" />
                  )}
                </div>
                {/* Gmail */}
                <div className="flex items-center justify-between rounded-lg border p-3 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-none">Gmail</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {gmailConnected
                          ? `${gmailCount} account${gmailCount !== 1 ? 's' : ''} connected`
                          : 'Scan receipts & invoices'}
                      </p>
                    </div>
                  </div>
                  {gmailConnected ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <Button variant="outline" size="sm" className="h-7 text-xs px-2" asChild>
                        <Link href="/api/gmail/connect">+ Add</Link>
                      </Button>
                    </div>
                  ) : (
                    <Button variant="default" size="sm" className="h-8 text-xs shrink-0" asChild>
                      <Link href="/api/gmail/connect">Connect</Link>
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )

      case 'summary':
        return (
          <div key={id} className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Spent</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalSpent.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-1">This month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Top Category</CardTitle>
                <Tag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{topCategory}</div>
                {topCategory !== '—' && (
                  <p className="text-xs text-muted-foreground mt-1">${categoryBreakdown[0]?.amount.toFixed(2)} spent</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Subscriptions</CardTitle>
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeSubscriptions}</div>
                <p className="text-xs text-muted-foreground mt-1">This month</p>
              </CardContent>
            </Card>
          </div>
        )

      case 'overhead': {
        const surplus = (incomeAmt ?? 0) - monthlyOverhead

        return (
          <Card key={id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Overhead
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="text-muted-foreground hover:text-foreground transition-colors">
                        <HelpCircle className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-56">
                      Your total fixed recurring costs — subscriptions (e.g. Netflix, Spotify) and payments (e.g. rent, car loans) combined.
                    </TooltipContent>
                  </Tooltip>
                </span>
                <Button
                  variant="ghost" size="sm"
                  className="h-7 text-xs gap-1.5"
                  onClick={() => {
                    setEditingIncome(!editingIncome)
                    setIncomeInput(String(incomeAmt ?? ''))
                    setIncomeLinkedMerchant(data.incomeLinkedMerchant ?? '')
                  }}
                >
                  <Pencil className="h-3 w-3" />
                  {incomeAmt
                    ? incomeSource === 'linked'
                      ? 'Edit link'
                      : 'Edit income'
                    : 'Set income'}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">

              {/* Overhead cost stats */}
              {monthlyOverhead > 0 && (
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <CalendarDays className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xl font-bold">${monthlyOverhead.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">per month</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xl font-bold">${dailyOverhead.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">per day</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xl font-bold">${yearlyOverhead.toFixed(0)}</p>
                      <p className="text-xs text-muted-foreground">per year</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Linked income status badge */}
              {incomeSource === 'linked' && incomeLinkedMerchant && !editingIncome && (
                <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/5 px-3 py-2">
                  <div className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">
                      Auto-updating from <span className="text-foreground">&ldquo;{incomeLinkedMerchant}&rdquo;</span>
                    </p>
                    {incomeLastTx && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Last: ${Number(incomeLastTx.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} on {format(new Date(incomeLastTx.date), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Income vs Overhead visualization */}
              {incomeAmt && incomeAmt > 0 ? (
                <>
                  {monthlyOverhead > 0 && <div className="h-px bg-border" />}

                  {/* Donut + comparison bars */}
                  <div className="flex flex-col sm:flex-row items-center gap-5">
                    <OverheadDonut overhead={monthlyOverhead} income={incomeAmt} />

                    <div className="flex-1 space-y-3 w-full min-w-0">
                      {/* Income bar */}
                      <div>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-muted-foreground">Monthly income</span>
                          <span className="font-semibold tabular-nums">
                            ${incomeAmt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="h-2.5 rounded-full bg-green-500/15">
                          <div className="h-2.5 rounded-full bg-green-500" style={{ width: '100%' }} />
                        </div>
                      </div>

                      {/* Overhead bar */}
                      <div>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-muted-foreground">Fixed overhead</span>
                          <span className="font-semibold tabular-nums">
                            ${monthlyOverhead.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="h-2.5 rounded-full bg-secondary">
                          <div
                            className={`h-2.5 rounded-full transition-all ${surplus >= 0 ? 'bg-orange-400' : 'bg-destructive'}`}
                            style={{ width: `${Math.min(100, incomeAmt > 0 ? (monthlyOverhead / incomeAmt) * 100 : 0)}%` }}
                          />
                        </div>
                      </div>

                      {/* Surplus / deficit */}
                      <div className="flex items-center justify-between pt-0.5">
                        <span className="text-xs text-muted-foreground">
                          {surplus >= 0 ? '✓ Monthly surplus' : '⚠ Monthly deficit'}
                        </span>
                        <Badge
                          variant={surplus >= 0 ? 'secondary' : 'destructive'}
                          className="text-xs font-semibold tabular-nums"
                        >
                          {surplus >= 0 ? '+' : ''}${Math.abs(surplus).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mo
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Income breakdown */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg border p-2.5">
                      <p className="text-sm font-bold tabular-nums">${incomeDaily.toFixed(2)}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">per day</p>
                    </div>
                    <div className="rounded-lg border p-2.5">
                      <p className="text-sm font-bold tabular-nums">${incomeWeekly.toFixed(2)}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">per week</p>
                    </div>
                    <div className="rounded-lg border p-2.5">
                      <p className="text-sm font-bold tabular-nums">${incomeBiweekly.toFixed(2)}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">bi-weekly</p>
                    </div>
                  </div>
                </>
              ) : !editingIncome ? (
                <button
                  onClick={() => { setEditingIncome(true); setIncomeInput('') }}
                  className="w-full rounded-lg border border-dashed p-4 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors text-center"
                >
                  + Set your monthly income to see overhead vs income breakdown
                </button>
              ) : null}

              {/* Income edit form */}
              {editingIncome && (
                <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
                  {/* Mode toggle */}
                  <div className="flex gap-2">
                    <Button
                      type="button" size="sm"
                      variant={incomeSource === 'manual' ? 'default' : 'outline'}
                      className="flex-1 h-7 text-xs"
                      onClick={() => setIncomeSource('manual')}
                    >
                      Manual amount
                    </Button>
                    <Button
                      type="button" size="sm"
                      variant={incomeSource === 'linked' ? 'default' : 'outline'}
                      className="flex-1 h-7 text-xs"
                      onClick={() => setIncomeSource('linked')}
                    >
                      Link to paycheck
                    </Button>
                  </div>

                  {incomeSource === 'manual' ? (
                    /* Manual amount entry */
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground">Monthly gross income</p>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          value={incomeInput}
                          onChange={e => setIncomeInput(e.target.value)}
                          placeholder="e.g. 5000"
                          className="flex-1 h-8 text-sm"
                          min="0"
                          step="0.01"
                          autoFocus
                          onKeyDown={e => e.key === 'Enter' && handleSaveIncome()}
                        />
                        <Button size="sm" className="h-8 px-3" onClick={handleSaveIncome} disabled={savingIncome}>
                          {savingIncome ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 px-3" onClick={() => setEditingIncome(false)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Linked paycheck entry */
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <p className="text-xs text-muted-foreground">
                          Paycheck merchant name — income auto-updates whenever a transaction from this merchant appears
                        </p>
                        <Input
                          value={incomeLinkedMerchant}
                          onChange={e => setIncomeLinkedMerchant(e.target.value)}
                          placeholder="e.g. ACME Corp Payroll, Gusto, ADP"
                          className="h-8 text-sm"
                          autoFocus
                        />
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-xs text-muted-foreground">Fallback monthly amount (if no matching transaction found yet)</p>
                        <Input
                          type="number"
                          value={incomeInput}
                          onChange={e => setIncomeInput(e.target.value)}
                          placeholder="e.g. 5000"
                          className="h-8 text-sm"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="ghost" className="h-8 px-3" onClick={() => setEditingIncome(false)}>
                          Cancel
                        </Button>
                        <Button
                          size="sm" className="h-8 gap-1.5"
                          onClick={handleSaveIncome}
                          disabled={savingIncome || !incomeLinkedMerchant.trim()}
                        >
                          {savingIncome ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                          Link paycheck
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Work week selector (shared between both modes) */}
                  <div className="flex gap-2 pt-1 border-t">
                    <Button
                      type="button" size="sm"
                      variant={incomeWeekType === '5-day' ? 'default' : 'outline'}
                      className="flex-1 h-7 text-xs"
                      onClick={() => setIncomeWeekType('5-day')}
                    >
                      5-day week (Mon–Fri)
                    </Button>
                    <Button
                      type="button" size="sm"
                      variant={incomeWeekType === '7-day' ? 'default' : 'outline'}
                      className="flex-1 h-7 text-xs"
                      onClick={() => setIncomeWeekType('7-day')}
                    >
                      7-day week (all days)
                    </Button>
                  </div>

                  {incomeSource === 'manual' && (
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="ghost" className="h-8 px-3" onClick={() => setEditingIncome(false)}>
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )
      }

      case 'budgets':
        return (
          <Card key={id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <PiggyBank className="h-4 w-4" />
                  Budgets &amp; Goals
                </span>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" asChild>
                  <Link href="/budgets">
                    View all <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <PiggyBank className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{budgetCount}</p>
                    <p className="text-xs text-muted-foreground">active budget{budgetCount !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{goalCount}</p>
                    <p className="text-xs text-muted-foreground">saving goal{goalCount !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              </div>
              {budgetCount === 0 && goalCount === 0 && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    Set spending limits and savings targets to stay on track
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/budgets">Get started →</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )

      case 'categories':
        return (
          <Card key={id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4" />Spending by Category
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
                          <div className={`h-2 rounded-full ${CATEGORY_COLORS[category] ?? 'bg-primary'}`}
                            style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )

      case 'recent':
        return (
          <Card key={id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ArrowUpRight className="h-4 w-4" />Recent Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentTransactions.length === 0 ? (
                <EmptyState message="Connect a bank or Gmail to see transactions here" />
              ) : (
                <div className="space-y-3">
                  {recentTransactions.map((t) => (
                    <div key={t.id} className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{t.merchant}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(t.date), 'MMM d')} · {t.category}
                          {t.custom_label && <span className="ml-1 text-primary">· {t.custom_label}</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        {t.recurring_type === 'subscription' && <Badge variant="secondary" className="text-xs">Sub</Badge>}
                        {t.recurring_type === 'payment' && <Badge variant="outline" className="text-xs">Payment</Badge>}
                        <span className="text-sm font-semibold">${Number(t.amount).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-8">
      <UpgradePrompt
        modal
        feature={upgradeModal.state.feature}
        requiredPlan={upgradeModal.state.requiredPlan}
        open={upgradeModal.state.open}
        onOpenChange={(open) => !open && upgradeModal.close()}
      />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">{month} overview</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Customize button */}
          <Sheet open={customizeOpen} onOpenChange={canCustomize ? setCustomizeOpen : undefined}>
            <SheetTrigger asChild>
              <Button
                variant="outline" size="sm" className="gap-1.5"
                onClick={canCustomize ? undefined : () => upgradeModal.trigger('dashboard_customization', 'plus')}
              >
                <Settings2 className="h-3.5 w-3.5" />
                Customize
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 flex flex-col">
              <SheetHeader>
                <SheetTitle>Customize Dashboard</SheetTitle>
                <p className="text-xs text-muted-foreground">Drag to reorder · Toggle to show/hide</p>
              </SheetHeader>
              <div className="flex-1 mt-4 overflow-y-auto">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {cards.map(card => (
                        <SortableItem
                          key={card.id}
                          id={card.id}
                          label={card.label}
                          visible={card.visible}
                          onToggle={() => toggleCard(card.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
              <div className="pt-4 border-t">
                <Button onClick={saveLayout} disabled={savingLayout} className="w-full">
                  {savingLayout && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                  Save Layout
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Onboarding — only visible until all 3 steps are complete */}
      <OnboardingCard
        bankConnected={banksConnected}
        gmailConnected={gmailConnected}
        hasTransactions={txList.length > 0}
      />

      {/* Render cards in configured order */}
      {cards.map(card => renderCard(card.id))}
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
