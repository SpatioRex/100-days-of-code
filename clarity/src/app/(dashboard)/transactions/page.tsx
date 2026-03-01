import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Inbox, Search } from 'lucide-react'
import { format } from 'date-fns'
import type { Transaction, TransactionCategory } from '@/types/database'

const CATEGORIES: TransactionCategory[] = [
  'Food',
  'Shopping',
  'Subscriptions',
  'Travel',
  'Utilities',
  'Entertainment',
  'Health',
  'Other',
]

const SOURCE_LABELS: Record<string, string> = {
  email: 'Gmail',
  upload: 'Upload',
}

interface PageProps {
  searchParams: Promise<{ category?: string; q?: string }>
}

export default async function TransactionsPage({ searchParams }: PageProps) {
  const { category, q } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let query = supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user!.id)
    .order('date', { ascending: false })

  if (category && category !== 'all') {
    query = query.eq('category', category)
  }

  if (q) {
    query = query.ilike('merchant', `%${q}%`)
  }

  const { data: transactions } = await query
  const txList = (transactions as Transaction[] | null) ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {txList.length} transaction{txList.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <form className="relative flex-1" method="get">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={q}
            placeholder="Search merchant..."
            className="pl-9"
          />
          {category && <input type="hidden" name="category" value={category} />}
        </form>
        <form method="get">
          {q && <input type="hidden" name="q" value={q} />}
          <Select name="category" defaultValue={category ?? 'all'}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </form>
      </div>

      {/* Table */}
      {txList.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm font-medium">No transactions found</p>
          <p className="text-xs text-muted-foreground mt-1">
            Connect Gmail or upload receipts to see your spending here
          </p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Merchant</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {txList.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {t.merchant}
                      {t.is_recurring && (
                        <Badge variant="secondary" className="text-xs">
                          Recurring
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(t.date), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{t.category}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {SOURCE_LABELS[t.source] ?? t.source}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    ${Number(t.amount).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
