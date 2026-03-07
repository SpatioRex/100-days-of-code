import { createClient } from '@/lib/supabase/server'
import { TransactionFilters } from './transaction-filters'
import type { Transaction } from '@/types/database'

export default async function TransactionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user!.id)
    .order('date', { ascending: false })

  const transactions = (data as Transaction[] | null) ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          All your imported transactions in one place
        </p>
      </div>
      <TransactionFilters transactions={transactions} />
    </div>
  )
}
