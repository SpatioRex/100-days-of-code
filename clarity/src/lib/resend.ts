import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY)

export const FROM_EMAIL = 'Clarity <onboarding@resend.dev>'

export async function sendWeeklyDigest({
  to,
  totalSpent,
  subscriptionCount,
  topCategory,
  newTransactions,
}: {
  to: string
  totalSpent: number
  subscriptionCount: number
  topCategory: string
  newTransactions: number
}) {
  const now = new Date()
  const weekStr = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Your Clarity Weekly Summary — Week of ${weekStr}`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h1 style="font-size: 20px; font-weight: 700; margin-bottom: 4px;">Weekly Summary</h1>
        <p style="color: #6b7280; font-size: 14px; margin-top: 0;">Week of ${weekStr}</p>

        <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
            <span style="color: #374151; font-size: 14px;">Total spent this week</span>
            <span style="font-weight: 700; font-size: 16px;">$${totalSpent.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
            <span style="color: #374151; font-size: 14px;">New transactions</span>
            <span style="font-weight: 600;">${newTransactions}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
            <span style="color: #374151; font-size: 14px;">Active subscriptions</span>
            <span style="font-weight: 600;">${subscriptionCount}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #374151; font-size: 14px;">Top category</span>
            <span style="font-weight: 600;">${topCategory}</span>
          </div>
        </div>

        <a href="https://financial-auditor.vercel.app/dashboard"
           style="display: block; background: #0f172a; color: white; text-align: center; padding: 12px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
          View Dashboard →
        </a>

        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
          Clarity · <a href="https://financial-auditor.vercel.app/settings" style="color: #9ca3af;">Manage notifications</a>
        </p>
      </div>
    `,
  })
}

export async function sendNewSubscriptionAlert({
  to,
  merchant,
  amount,
}: {
  to: string
  merchant: string
  amount: number
}) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `New subscription detected: ${merchant}`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h1 style="font-size: 20px; font-weight: 700;">New Subscription Detected</h1>
        <p style="color: #6b7280;">Clarity found a new recurring charge in your accounts.</p>

        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <p style="font-weight: 700; font-size: 18px; margin: 0 0 4px;">${merchant}</p>
          <p style="color: #dc2626; font-size: 24px; font-weight: 700; margin: 0;">$${amount.toFixed(2)}/mo</p>
        </div>

        <a href="https://financial-auditor.vercel.app/subscriptions"
           style="display: block; background: #0f172a; color: white; text-align: center; padding: 12px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
          View Subscriptions →
        </a>

        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
          Clarity · <a href="https://financial-auditor.vercel.app/settings" style="color: #9ca3af;">Manage notifications</a>
        </p>
      </div>
    `,
  })
}

export async function sendLargeTransactionAlert({
  to,
  merchant,
  amount,
}: {
  to: string
  merchant: string
  amount: number
}) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Large transaction: $${amount.toFixed(2)} at ${merchant}`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h1 style="font-size: 20px; font-weight: 700;">Large Transaction Alert</h1>
        <p style="color: #6b7280;">A transaction above your alert threshold was detected.</p>

        <div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <p style="font-weight: 700; font-size: 18px; margin: 0 0 4px;">${merchant}</p>
          <p style="color: #d97706; font-size: 24px; font-weight: 700; margin: 0;">$${amount.toFixed(2)}</p>
        </div>

        <a href="https://financial-auditor.vercel.app/transactions"
           style="display: block; background: #0f172a; color: white; text-align: center; padding: 12px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
          View Transactions →
        </a>

        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
          Clarity · <a href="https://financial-auditor.vercel.app/settings" style="color: #9ca3af;">Manage notifications</a>
        </p>
      </div>
    `,
  })
}
