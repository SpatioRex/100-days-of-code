import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Shield, User } from 'lucide-react'
import { SignOutButton } from './sign-out-button'
import { DeleteAccountButton } from './delete-account-button'
import { GmailCard } from './gmail-card'
import { BankCard } from './bank-card'
import { ReceiptUploadCard } from './receipt-upload-card'
import { NotificationPreferencesCard } from './notification-preferences-card'
import { BillingCard } from './billing-card'
import { resolvePlan } from '@/lib/subscription'
import type { SubscriptionRow } from '@/lib/subscription'

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>
}) {
  const { success, error } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: gmailRaw }, { data: bankRaw }, { data: subRow }] = await Promise.all([
    supabase.from('gmail_connections').select('id, email, provider, last_synced_at').eq('user_id', user!.id),
    supabase.from('bank_connections').select('id, institution_name, last_synced_at').eq('user_id', user!.id),
    supabase.from('user_subscriptions')
      .select('plan, status, trial_started_at, current_period_end, stripe_subscription_id')
      .eq('user_id', user!.id)
      .maybeSingle(),
  ])

  const gmailConnections = (gmailRaw ?? []) as { id: string; email: string | null; provider: string; last_synced_at: string | null }[]
  const bankConnections = (bankRaw ?? []) as { id: string; institution_name: string; last_synced_at: string | null }[]

  const plan = resolvePlan(subRow as SubscriptionRow | null)

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account and integrations</p>
      </div>

      {/* Billing */}
      <BillingCard
        plan={plan}
        trialStartedAt={subRow?.trial_started_at ?? null}
        currentPeriodEnd={subRow?.current_period_end ?? null}
        hasStripeSubscription={!!subRow?.stripe_subscription_id}
      />

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Email</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
            <Badge variant="secondary">Active</Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Sign out</p>
              <p className="text-sm text-muted-foreground">Sign out of your Clarity account</p>
            </div>
            <SignOutButton />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Delete account</p>
              <p className="text-sm text-muted-foreground">Permanently remove your account and all data</p>
            </div>
            <DeleteAccountButton />
          </div>
        </CardContent>
      </Card>

      {/* Bank Accounts */}
      <BankCard connections={bankConnections} />

      {/* Email Accounts */}
      <GmailCard
        connections={gmailConnections}
        successParam={success}
        errorParam={error}
      />

      {/* Receipt Upload */}
      <ReceiptUploadCard />

      {/* Notification Preferences */}
      <NotificationPreferencesCard />

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4" />Security
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Row-level security</p>
              <p className="text-sm text-muted-foreground">Your data is private — only you can access it</p>
            </div>
            <Badge variant="secondary">Enabled</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
