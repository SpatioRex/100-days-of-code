export type TransactionSource = 'email' | 'upload'

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
  source: TransactionSource
  raw_text: string | null
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

export type Database = {
  public: {
    Tables: {
      transactions: {
        Row: Transaction
        Insert: Omit<Transaction, 'id' | 'created_at'>
        Update: Partial<Omit<Transaction, 'id' | 'user_id' | 'created_at'>>
      }
      gmail_connections: {
        Row: GmailConnection
        Insert: Omit<GmailConnection, 'id' | 'created_at'>
        Update: Partial<Omit<GmailConnection, 'id' | 'user_id' | 'created_at'>>
      }
    }
  }
}
