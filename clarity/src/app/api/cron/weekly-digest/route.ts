import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendWeeklyDigest } from '@/lib/resend'

export const maxDuration = 60

// Called by Vercel Cron every Monday at 9am UTC
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  // Get all users with email notifications + weekly digest enabled
  const { data: prefs } = await supabase
    .from('notification_preferences')
    .select('user_id, email_enabled, weekly_digest')
    .eq('email_enabled', true)
    .eq('weekly_digest', true)

  if (!prefs?.length) return NextResponse.json({ sent: 0 })

  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const weekAgoStr = weekAgo.toISOString().split('T')[0]

  let sent = 0
  const errors: string[] = []

  for (const pref of prefs) {
    try {
      // Get user email
      const { data: { user } } = await supabase.auth.admin.getUserById(pref.user_id)
      if (!user?.email) continue

      // Get this week's transactions
      const { data: txs } = await supabase
        .from('transactions')
        .select('amount, category, recurring_type, is_recurring')
        .eq('user_id', pref.user_id)
        .gte('date', weekAgoStr)

      const totalSpent = (txs ?? []).reduce((sum, t) => sum + Number(t.amount), 0)
      const subscriptionCount = (txs ?? []).filter(t => t.recurring_type === 'subscription' || (t.is_recurring && !t.recurring_type)).length

      // Find top category
      const catMap: Record<string, number> = {}
      for (const t of txs ?? []) {
        catMap[t.category] = (catMap[t.category] ?? 0) + Number(t.amount)
      }
      const topCategory = Object.entries(catMap).sort(([, a], [, b]) => b - a)[0]?.[0] ?? '—'

      await sendWeeklyDigest({
        to: user.email,
        totalSpent,
        subscriptionCount,
        topCategory,
        newTransactions: txs?.length ?? 0,
      })

      // Create in-app notification too
      await supabase.from('notifications').insert({
        user_id: pref.user_id,
        type: 'weekly_digest',
        title: 'Weekly Summary Ready',
        message: `You spent $${totalSpent.toFixed(2)} across ${txs?.length ?? 0} transactions this week.`,
      })

      sent++
    } catch (err: any) {
      errors.push(err.message)
    }
  }

  return NextResponse.json({ sent, errors })
}
