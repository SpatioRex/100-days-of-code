export type TransactionSource = 'email' | 'upload' | 'bank'

export interface ReceiptItem {
  name: string
  price: number
  quantity?: number
}

export type TransactionCategory =
  | 'Food'
  | 'Shopping'
  | 'Subscriptions'
  | 'Travel'
  | 'Utilities'
  | 'Entertainment'
  | 'Health'
  | 'Other'

export interface Transaction {
  id: string
  user_id: string
  merchant: string
  amount: number
  date: string
  category: TransactionCategory
  is_recurring: boolean
  recurring_type: 'subscription' | 'payment' | null
  custom_label: string | null
  source: TransactionSource
  raw_text: string | null
  content_hash: string | null
  items: ReceiptItem[] | null          // line items from receipt uploads
  linked_transaction_id: string | null // future: link receipt ↔ bank transaction
  created_at: string
}

export interface GmailConnection {
  id: string
  user_id: string
  access_token: string
  refresh_token: string | null
  last_synced_at: string | null
  created_at: string
}

export type BudgetPeriod = 'daily' | 'weekly' | 'monthly'

export interface Budget {
  id: string
  user_id: string
  name: string
  category: TransactionCategory | null
  merchant: string | null
  amount: number
  period: BudgetPeriod
  is_active: boolean
  created_at: string
}

export interface BudgetWithSpend extends Budget {
  spent: number
  remaining: number
  percentUsed: number
  periodStart: string
  periodEnd: string
  status: 'on-track' | 'warning' | 'over' | 'no-activity'
}

export interface Goal {
  id: string
  user_id: string
  name: string
  target_amount: number
  target_date: string   // YYYY-MM-DD
  emoji: string
  created_at: string
}

export interface GoalContribution {
  id: string
  goal_id: string
  user_id: string
  amount: number
  note: string | null
  date: string          // YYYY-MM-DD
  created_at: string
}

export type GoalPace = 'ahead' | 'on-track' | 'behind' | 'no-data' | 'complete'

export interface GoalWithProgress extends Goal {
  totalSaved: number
  remaining: number
  percentSaved: number
  daysLeft: number
  pace: GoalPace
  avgPerMonth: number          // based on actual contributions
  neededPerMonth: number       // to hit the goal by the deadline
  contributions: GoalContribution[]
}

export type Database = {
  public: {
    Tables: {
      transactions: {
        Row: Transaction
        Insert: Omit<Transaction, 'id' | 'created_at'>
        Update: Partial<Omit<Transaction, 'id' | 'user_id' | 'created_at'>>
        Relationships: []
      }
      gmail_connections: {
        Row: GmailConnection
        Insert: Omit<GmailConnection, 'id' | 'created_at'>
        Update: Partial<Omit<GmailConnection, 'id' | 'user_id' | 'created_at'>>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
