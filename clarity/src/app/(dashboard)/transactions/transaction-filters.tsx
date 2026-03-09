'use client'

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Label } from '@/components/ui/label'
import { Search, RefreshCw, X, Inbox, Pencil, Loader2, Trash2, Receipt } from 'lucide-react'
import { format, startOfMonth, subMonths, parseISO } from 'date-fns'
import { toast } from 'sonner'
import type { Transaction, TransactionCategory, ReceiptItem } from '@/types/database'

const CATEGORIES: TransactionCategory[] = ['Food', 'Shopping', 'Subscriptions', 'Travel', 'Utilities', 'Entertainment', 'Health', 'Other']
const SOURCE_LABELS: Record<string, string> = { email: 'Gmail', upload: 'Upload', bank: 'Bank' }

const DATE_PRESETS = [
  { label: 'This month', getValue: () => ({ from: format(startOfMonth(new Date()), 'yyyy-MM-dd'), to: '' }) },
  { label: 'Last month', getValue: () => ({ from: format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'), to: format(startOfMonth(new Date()), 'yyyy-MM-dd') }) },
  { label: 'Last 3 months', getValue: () => ({ from: format(subMonths(new Date(), 3), 'yyyy-MM-dd'), to: '' }) },
  { label: 'All time', getValue: () => ({ from: '', to: '' }) },
]

const TYPE_BADGE: Record<string, { label: string; variant: 'secondary' | 'outline' | 'destructive' }> = {
  subscription: { label: 'Sub', variant: 'secondary' },
  payment: { label: 'Payment', variant: 'outline' },
}

interface Props {
  transactions: Transaction[]
}

interface EditForm {
  merchant: string
  amount: string
  date: string
  category: TransactionCategory
  recurring_type: string
  custom_label: string
}

export function TransactionFilters({ transactions: initial }: Props) {
  const [transactions, setTransactions] = useState(initial)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [dateFrom, setDateFrom] = useState(() => format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState('')
  const [recurringOnly, setRecurringOnly] = useState(false)
  const [activePreset, setActivePreset] = useState('This month')

  // Edit modal state
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [editForm, setEditForm] = useState<EditForm | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function openEdit(tx: Transaction) {
    setEditingTx(tx)
    setEditForm({
      merchant: tx.merchant,
      amount: String(Number(tx.amount).toFixed(2)),
      date: tx.date,
      category: tx.category,
      recurring_type: tx.recurring_type ?? '',
      custom_label: tx.custom_label ?? '',
    })
  }

  function closeEdit() {
    setEditingTx(null)
    setEditForm(null)
  }

  async function saveEdit() {
    if (!editingTx || !editForm) return
    setSaving(true)
    try {
      const res = await fetch(`/api/transactions/${editingTx.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant: editForm.merchant,
          amount: editForm.amount,
          date: editForm.date,
          category: editForm.category,
          recurring_type: editForm.recurring_type || null,
          custom_label: editForm.custom_label || null,
        }),
      })
      if (!res.ok) {
        const j = await res.json()
        toast.error(j.error ?? 'Failed to save')
        return
      }
      const updated = await res.json()
      setTransactions((prev) => prev.map((t) => t.id === updated.id ? updated : t))
      toast.success('Transaction updated')
      closeEdit()
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function deleteTransaction(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        toast.error('Failed to delete')
        return
      }
      setTransactions((prev) => prev.filter((t) => t.id !== id))
      toast.success('Transaction deleted')
      closeEdit()
    } catch {
      toast.error('Failed to delete')
    } finally {
      setDeletingId(null)
    }
  }

  function applyPreset(preset: typeof DATE_PRESETS[0]) {
    const { from, to } = preset.getValue()
    setDateFrom(from)
    setDateTo(to)
    setActivePreset(preset.label)
  }

  function clearFilters() {
    setSearch('')
    setCategory('all')
    setDateFrom('')
    setDateTo('')
    setRecurringOnly(false)
    setActivePreset('All time')
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return transactions.filter((t) => {
      if (q) {
        // Format the date multiple ways so users can search "Jan 5", "January", "2025-01-05", etc.
        const dateObj = parseISO(t.date + 'T12:00:00')
        const dateFormats = [
          format(dateObj, 'MMM d yyyy'),      // "Jan 5 2025"
          format(dateObj, 'MMMM d yyyy'),     // "January 5 2025"
          format(dateObj, 'MMM d'),           // "Jan 5"
          format(dateObj, 'MMMM'),            // "January"
          format(dateObj, 'yyyy-MM-dd'),      // "2025-01-05"
          format(dateObj, 'MM/dd/yyyy'),      // "01/05/2025"
        ]
        const matchesDate = dateFormats.some(d => d.toLowerCase().includes(q))
        const matchesMerchant = t.merchant.toLowerCase().includes(q)
        const matchesLabel = t.custom_label?.toLowerCase().includes(q) ?? false
        if (!matchesMerchant && !matchesLabel && !matchesDate) return false
      }
      if (category !== 'all' && t.category !== category) return false
      if (recurringOnly && !t.is_recurring && !t.recurring_type) return false
      if (dateFrom && t.date < dateFrom) return false
      if (dateTo && t.date > dateTo) return false
      return true
    })
  }, [transactions, search, category, recurringOnly, dateFrom, dateTo])

  const total = filtered.reduce((s, t) => s + Number(t.amount), 0)
  const hasActiveFilters = search || category !== 'all' || recurringOnly || dateFrom || dateTo

  return (
    <div className="space-y-4">
      {/* Date presets */}
      <div className="flex flex-wrap gap-2">
        {DATE_PRESETS.map((p) => (
          <Button
            key={p.label}
            variant={activePreset === p.label ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => applyPreset(p)}
          >
            {p.label}
          </Button>
        ))}
        {/* Custom date range */}
        <div className="flex items-center gap-1">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setActivePreset('') }}
            className="h-7 rounded-md border bg-background px-2 text-xs text-foreground"
          />
          <span className="text-xs text-muted-foreground">→</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setActivePreset('') }}
            className="h-7 rounded-md border bg-background px-2 text-xs text-foreground"
          />
        </div>
      </div>

      {/* Search + filters row */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search merchant, label, or date…"
            className="pl-9 h-9"
          />
        </div>

        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-40 h-9">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        <Button
          variant={recurringOnly ? 'default' : 'outline'}
          size="sm"
          className="h-9 gap-1.5"
          onClick={() => setRecurringOnly(!recurringOnly)}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Recurring only
        </Button>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="h-9 gap-1 text-muted-foreground" onClick={clearFilters}>
            <X className="h-3.5 w-3.5" /> Clear
          </Button>
        )}
      </div>

      {/* Results summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{filtered.length} transaction{filtered.length !== 1 ? 's' : ''}</span>
        {filtered.length > 0 && (
          <span className="font-medium text-foreground">${total.toFixed(2)} total</span>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm font-medium">No transactions match your filters</p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={clearFilters}>Clear filters</Button>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Merchant</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t) => {
                const typeInfo = t.recurring_type ? TYPE_BADGE[t.recurring_type] : null
                return (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          {t.merchant}
                          {typeInfo && (
                            <Badge variant={typeInfo.variant} className="text-xs shrink-0">
                              <RefreshCw className="h-2.5 w-2.5 mr-1" />{typeInfo.label}
                            </Badge>
                          )}
                          {t.items && t.items.length > 0 && (
                            <span title={`${t.items.length} item${t.items.length !== 1 ? 's' : ''}`} className="text-muted-foreground shrink-0">
                              <Receipt className="h-3 w-3" />
                            </span>
                          )}
                        </div>
                        {t.custom_label && (
                          <span className="text-xs text-primary font-normal">{t.custom_label}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(parseISO(t.date + 'T12:00:00'), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{t.category}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {SOURCE_LABELS[t.source] ?? t.source}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ${Number(t.amount).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => openEdit(t)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingTx} onOpenChange={(open) => { if (!open) closeEdit() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
            <DialogDescription className="sr-only">Edit transaction details including merchant, amount, date, category, and type.</DialogDescription>
          </DialogHeader>
          {editForm && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit-merchant">Merchant</Label>
                <Input
                  id="edit-merchant"
                  value={editForm.merchant}
                  onChange={(e) => setEditForm({ ...editForm, merchant: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-amount">Amount ($)</Label>
                  <Input
                    id="edit-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={editForm.amount}
                    onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-date">Date</Label>
                  <input
                    id="edit-date"
                    type="date"
                    value={editForm.date}
                    onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select
                    value={editForm.category}
                    onValueChange={(v) => setEditForm({ ...editForm, category: v as TransactionCategory })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select
                    value={editForm.recurring_type || 'none'}
                    onValueChange={(v) => setEditForm({ ...editForm, recurring_type: v === 'none' ? '' : v })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">One-time</SelectItem>
                      <SelectItem value="subscription">Subscription</SelectItem>
                      <SelectItem value="payment">Payment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-label">Label <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input
                  id="edit-label"
                  placeholder="e.g. Work laptop, Living room rent…"
                  value={editForm.custom_label}
                  onChange={(e) => setEditForm({ ...editForm, custom_label: e.target.value })}
                />
              </div>

              {/* Receipt line items — shown only when the transaction has items */}
              {editingTx?.items && editingTx.items.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <Receipt className="h-3.5 w-3.5" /> Receipt Items
                  </Label>
                  <div className="rounded-md border divide-y text-sm">
                    {editingTx.items.map((item: ReceiptItem, i: number) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2 gap-2">
                        <span className="text-foreground">
                          {item.quantity && item.quantity > 1 && (
                            <span className="text-muted-foreground mr-1">{item.quantity}×</span>
                          )}
                          {item.name}
                        </span>
                        <span className="font-medium shrink-0">${Number(item.price).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between px-3 py-2 gap-2 bg-muted/30">
                      <span className="text-muted-foreground text-xs font-medium">Total</span>
                      <span className="font-semibold">${Number(editingTx.amount).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex items-center justify-between sm:justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive gap-1.5"
              onClick={() => editingTx && deleteTransaction(editingTx.id)}
              disabled={!!deletingId || saving}
            >
              {deletingId === editingTx?.id
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Trash2 className="h-3.5 w-3.5" />}
              Delete
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={closeEdit} disabled={saving}>Cancel</Button>
              <Button onClick={saveEdit} disabled={saving}>
                {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                Save
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
