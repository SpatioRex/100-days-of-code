import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-02-25.clover',
})

export const STRIPE_PRICES = {
  plusMonthly: process.env.STRIPE_PLUS_MONTHLY_PRICE_ID!,
  plusYearly: process.env.STRIPE_PLUS_YEARLY_PRICE_ID!,
  proMonthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID!,
  proYearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID!,
} as const

/** Map a Stripe price ID back to a plan name */
export function planFromPriceId(priceId: string): 'plus' | 'pro' | null {
  if (
    priceId === process.env.STRIPE_PLUS_MONTHLY_PRICE_ID ||
    priceId === process.env.STRIPE_PLUS_YEARLY_PRICE_ID
  ) return 'plus'
  if (
    priceId === process.env.STRIPE_PRO_MONTHLY_PRICE_ID ||
    priceId === process.env.STRIPE_PRO_YEARLY_PRICE_ID
  ) return 'pro'
  return null
}
