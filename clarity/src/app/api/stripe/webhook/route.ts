import { NextResponse } from 'next/server'
import { getStripe, planFromPriceId } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'

// Use service-role client — webhook runs outside user session
function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/** Compute approximate period end from a subscription's billing_cycle_anchor + price interval */
function computePeriodEnd(subscription: Stripe.Subscription): string | null {
  const item = subscription.items.data[0]
  const interval = item?.price.recurring?.interval
  const intervalCount = item?.price.recurring?.interval_count ?? 1
  const anchor = subscription.billing_cycle_anchor * 1000

  if (!interval) return null

  const anchorDate = new Date(anchor)
  const now = new Date()

  // Find the next billing date after now based on interval
  let nextDate = new Date(anchorDate)
  while (nextDate <= now) {
    if (interval === 'month') nextDate.setMonth(nextDate.getMonth() + intervalCount)
    else if (interval === 'year') nextDate.setFullYear(nextDate.getFullYear() + intervalCount)
    else if (interval === 'week') nextDate.setDate(nextDate.getDate() + 7 * intervalCount)
    else nextDate.setDate(nextDate.getDate() + intervalCount)
  }

  return nextDate.toISOString()
}

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) return NextResponse.json({ error: 'No signature' }, { status: 400 })

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = adminClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.mode !== 'subscription') break

      const customerId = session.customer as string
      const subscriptionId = session.subscription as string

      // Determine plan from the subscription's price
      const subscription = await getStripe().subscriptions.retrieve(subscriptionId, {
        expand: ['items.data.price'],
      })
      const priceId = subscription.items.data[0]?.price.id
      const plan = planFromPriceId(priceId) ?? 'plus'

      await supabase
        .from('user_subscriptions')
        .update({
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          plan,
          status: subscription.status,
          current_period_end: computePeriodEnd(subscription),
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_customer_id', customerId)

      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const priceId = subscription.items.data[0]?.price.id
      const plan = planFromPriceId(priceId) ?? 'plus'

      await supabase
        .from('user_subscriptions')
        .update({
          plan,
          status: subscription.status,
          current_period_end: computePeriodEnd(subscription),
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscription.id)

      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      await supabase
        .from('user_subscriptions')
        .update({
          plan: 'locked',
          status: 'canceled',
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscription.id)
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const subscriptionId = invoice.parent?.subscription_details?.subscription
      if (!subscriptionId) break
      await supabase
        .from('user_subscriptions')
        .update({ status: 'past_due', updated_at: new Date().toISOString() })
        .eq('stripe_subscription_id', typeof subscriptionId === 'string' ? subscriptionId : subscriptionId.id)
      break
    }
  }

  return NextResponse.json({ received: true })
}
