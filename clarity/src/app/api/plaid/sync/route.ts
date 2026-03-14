import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { plaidClient } from '@/lib/plaid'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { sendNewSubscriptionAlert, sendLargeTransactionAlert } from '@/lib/resend'

const CATEGORY_MAP: Record<string, string> = {
  'Food and Drink': 'Food',
  'Shops': 'Shopping',
  'Travel': 'Travel',
  'Recreation': 'Entertainment',
  'Healthcare': 'Health',
  'Service': 'Utilities',
  'Transfer': 'Other',
  'Payment': 'Subscriptions',
  'Bank Fees': 'Other',
  'Interest': 'Other',
  'Tax': 'Utilities',
}

function mapCategory(plaidCategories: string[] | null): string {
  if (!plaidCategories?.length) return 'Other'
  const top = plaidCategories[0]
  return CATEGORY_MAP[top] ?? 'Other'
}

function isLikelyRecurring(name: string, categories: string[] | null): boolean {
  const recurringKeywords = ['netflix', 'spotify', 'hulu', 'amazon prime', 'apple', 'google', 'microsoft', 'subscription', 'monthly', 'annual']
  const nameLower = name.toLowerCase()
  if (recurringKeywords.some(k => nameLower.includes(k))) return true
  if (categories?.includes('Service')) return false
  return false
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = await checkRateLimit(user.id, RATE_LIMITS.plaidSync)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many sync requests. Please wait a few minutes.' },
      { status: 429, headers: { 'Retry-After': String(RATE_LIMITS.plaidSync.windowSeconds) } }
    )
  }

  const { data: connections } = await supabase
    .from('bank_connections')
    .select('*')
    .eq('user_id', user.id)

  if (!connections?.length) {
    return NextResponse.json({ error: 'No bank accounts connected' }, { status: 400 })
  }

  // Load notification preferences once for this user
  const { data: prefs } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single()

  const notifPrefs = prefs ?? {
    email_enabled: false,
    inapp_enabled: true,
    new_subscription_alert: true,
    large_transaction_alert: true,
    large_transaction_threshold: 100,
  }

  let totalSynced = 0
  let totalSkipped = 0
  let newSubscriptions = 0
  let largeTransactions = 0

  let productNotReady = false

  for (const conn of connections as any[]) {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 90)
      const endDate = new Date()

      const txResponse = await plaidClient.transactionsGet({
        access_token: conn.access_token,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        options: { count: 100, offset: 0 },
      })

      const plaidTransactions = txResponse.data.transactions

      // Get existing plaid_transaction_ids to detect truly new ones
      const incomingIds = plaidTransactions
        .filter(tx => !tx.pending)
        .map(tx => tx.transaction_id)

      const { data: existing } = await supabase
        .from('transactions')
        .select('plaid_transaction_id')
        .eq('user_id', user.id)
        .in('plaid_transaction_id', incomingIds)

      const existingIds = new Set((existing ?? []).map((r: { plaid_transaction_id: string }) => r.plaid_transaction_id))

      for (const tx of plaidTransactions) {
        if (tx.pending) { totalSkipped++; continue }

        const merchant = tx.merchant_name ?? tx.name
        const amount = Math.abs(tx.amount)
        const isRecurring = isLikelyRecurring(merchant, tx.category ?? null)
        const isNew = !existingIds.has(tx.transaction_id)

        const { error } = await supabase.from('transactions').upsert(
          {
            user_id: user.id,
            bank_connection_id: conn.id,
            plaid_transaction_id: tx.transaction_id,
            merchant,
            amount,
            date: tx.date,
            category: mapCategory(tx.category ?? null),
            is_recurring: isRecurring,
            source: 'bank',
            raw_text: null,
          },
          { onConflict: 'plaid_transaction_id' }
        )

        if (error) { totalSkipped++; continue }
        totalSynced++

        if (!isNew) continue  // Only alert for brand-new transactions

        // ── New subscription alert ─────────────────────────────────────
        if (isRecurring && notifPrefs.new_subscription_alert) {
          newSubscriptions++
          if (notifPrefs.inapp_enabled) {
            await supabase.from('notifications').insert({
              user_id: user.id,
              type: 'new_subscription',
              title: 'New subscription detected',
              message: `${merchant} — $${amount.toFixed(2)}/mo`,
              read: false,
            })
          }
          if (notifPrefs.email_enabled && user.email) {
            sendNewSubscriptionAlert({ to: user.email, merchant, amount }).catch(console.error)
          }
        }

        // ── Large transaction alert ────────────────────────────────────
        const threshold = notifPrefs.large_transaction_threshold ?? 100
        if (notifPrefs.large_transaction_alert && amount >= threshold) {
          largeTransactions++
          if (notifPrefs.inapp_enabled) {
            await supabase.from('notifications').insert({
              user_id: user.id,
              type: 'large_transaction',
              title: 'Large transaction alert',
              message: `$${amount.toFixed(2)} at ${merchant}`,
              read: false,
            })
          }
          if (notifPrefs.email_enabled && user.email) {
            sendLargeTransactionAlert({ to: user.email, merchant, amount }).catch(console.error)
          }
        }
      }

      await supabase
        .from('bank_connections')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', conn.id)
    } catch (err: any) {
      const code = err?.response?.data?.error_code
      if (code === 'PRODUCT_NOT_READY') {
        productNotReady = true
      } else {
        console.error(`Plaid sync error for connection ${conn.id}:`, err)
      }
    }
  }

  // Sync-complete in-app notification
  if (notifPrefs.inapp_enabled && totalSynced > 0) {
    await supabase.from('notifications').insert({
      user_id: user.id,
      type: 'sync_complete',
      title: 'Sync complete',
      message: `${totalSynced} new transaction${totalSynced === 1 ? '' : 's'} imported.`,
      read: false,
    })
  }

  return NextResponse.json({
    synced: totalSynced,
    skipped: totalSkipped,
    alerts: { newSubscriptions, largeTransactions },
    ...(productNotReady && { product_not_ready: true }),
  })
}
