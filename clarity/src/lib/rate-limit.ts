/**
 * Lightweight per-user rate limiting backed by Supabase.
 *
 * Uses the notifications table's created_at column as a lightweight proxy —
 * no extra table needed. For each "expensive" action we track a sentinel
 * notification entry and count how many exist within the window.
 *
 * For proper production rate limiting at scale, swap this for Upstash Redis.
 */

import { createClient } from '@/lib/supabase/server'

export interface RateLimitConfig {
  /** Unique key for this action, e.g. "gmail_sync" */
  action: string
  /** Maximum calls allowed within the window */
  limit: number
  /** Window size in seconds */
  windowSeconds: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
}

/**
 * Check and increment the rate limit counter for a user + action.
 * Returns { allowed: false } when the limit is exceeded.
 */
export async function checkRateLimit(
  userId: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const supabase = await createClient()
  const windowStart = new Date(Date.now() - config.windowSeconds * 1000).toISOString()
  const resetAt = new Date(Date.now() + config.windowSeconds * 1000)

  // Count recent sentinel entries for this user + action
  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('type', `__ratelimit__${config.action}`)
    .gte('created_at', windowStart)

  const used = count ?? 0
  const remaining = Math.max(0, config.limit - used)

  if (used >= config.limit) {
    return { allowed: false, remaining: 0, resetAt }
  }

  // Record this call
  await supabase.from('notifications').insert({
    user_id: userId,
    type: `__ratelimit__${config.action}`,
    title: '',
    message: '',
    read: true, // never show in bell
  })

  return { allowed: true, remaining: remaining - 1, resetAt }
}

// Pre-defined configs for each expensive route
export const RATE_LIMITS = {
  gmailSync: { action: 'gmail_sync', limit: 5, windowSeconds: 300 } satisfies RateLimitConfig,   // 5 per 5 min
  receiptUpload: { action: 'receipt_upload', limit: 20, windowSeconds: 3600 } satisfies RateLimitConfig, // 20 per hour
  plaidSync: { action: 'plaid_sync', limit: 10, windowSeconds: 300 } satisfies RateLimitConfig,  // 10 per 5 min
} as const
