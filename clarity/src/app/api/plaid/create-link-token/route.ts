import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { plaidClient, Products, CountryCode } from '@/lib/plaid'
import { getUserPlan, PLAN_LIMITS, isAtLimit, upgradeRequired } from '@/lib/subscription'

export async function POST(req: Request) {
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
    .from('bank_connections')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  if (isAtLimit(count ?? 0, limit)) {
    return NextResponse.json(upgradeRequired('bank_connections', 'pro'), { status: 403 })
  }

  try {
    // Derive the app origin for the OAuth redirect URI.
    // Major banks (Chase, BoA, Wells Fargo, etc.) use OAuth in Plaid production
    // and require a redirect_uri both here and registered in the Plaid dashboard.
    const origin =
      req.headers.get('origin') ??
      process.env.NEXT_PUBLIC_APP_URL ??
      'http://localhost:3000'

    const isProduction = process.env.PLAID_ENV === 'production' || process.env.PLAID_ENV === 'development'

    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: user.id },
      client_name: 'Clarity',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
      // redirect_uri is required for OAuth banks in non-sandbox environments.
      // The user must also register this URI in the Plaid dashboard:
      // https://dashboard.plaid.com/developers/api → Allowed redirect URIs
      ...(isProduction && { redirect_uri: `${origin}/dashboard` }),
    })

    return NextResponse.json({ link_token: response.data.link_token })
  } catch (err: any) {
    const plaidError = err?.response?.data?.error_message ?? err?.message ?? 'Failed to create link token'
    console.error('Plaid create link token error:', JSON.stringify(err?.response?.data ?? err))
    return NextResponse.json({ error: plaidError }, { status: 500 })
  }
}
