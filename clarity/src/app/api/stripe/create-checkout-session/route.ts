import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripe, STRIPE_PRICES } from '@/lib/stripe'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  // Accept either { priceId } directly or { plan, interval } (preferred — no price ID client exposure)
  let priceId: string | undefined = body.priceId
  if (!priceId && body.plan && body.interval) {
    const key = `${body.plan}${body.interval.charAt(0).toUpperCase() + body.interval.slice(1)}` as keyof typeof STRIPE_PRICES
    priceId = STRIPE_PRICES[key]
  }
  if (!priceId) return NextResponse.json({ error: 'priceId or plan+interval required' }, { status: 400 })

  // Get or create Stripe customer
  const { data: sub } = await supabase
    .from('user_subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .single()

  let customerId = sub?.stripe_customer_id

  if (!customerId) {
    const customer = await getStripe().customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id },
    })
    customerId = customer.id
    await supabase
      .from('user_subscriptions')
      .upsert({ user_id: user.id, stripe_customer_id: customerId })
  }

  const origin = req.headers.get('origin') ?? 'http://localhost:3000'

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/dashboard?upgraded=1`,
    cancel_url: `${origin}/pricing`,
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
  })

  return NextResponse.json({ url: session.url })
}
