import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { plaidClient, Products, CountryCode } from '@/lib/plaid'
import { getUserPlan, PLAN_LIMITS, isAtLimit, upgradeRequired } from '@/lib/subscription'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const plan = await getUserPlan(user.id, supabase)
  const limit = PLAN_LIMITS[plan].bankConnections

  if (limit === 0) {
    return NextResponse.json(upgradeRequired('bank_connections', 'plus'), { status: 403 })
  }

  // Count existing Plaid-connected accounts
  const { count } = await supabase
    .from('plaid_connections')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  if (isAtLimit(count ?? 0, limit)) {
    return NextResponse.json(upgradeRequired('bank_connections', 'pro'), { status: 403 })
  }

  try {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: user.id },
      client_name: 'Clarity',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
    })

    return NextResponse.json({ link_token: response.data.link_token })
  } catch (err) {
    console.error('Plaid create link token error:', err)
    return NextResponse.json({ error: 'Failed to create link token' }, { status: 500 })
  }
}
