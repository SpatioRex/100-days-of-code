import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Mail, Upload, Shield, User } from 'lucide-react'
import { SignOutButton } from './sign-out-button'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: gmailConnectionRaw } = await supabase
    .from('gmail_connections')
    .select('*')
    .eq('user_id', user!.id)
    .maybeSingle()

  const gmailConnection = gmailConnectionRaw as { last_synced_at: string | null } | null

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account and integrations
        </p>
      </div>

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            Account
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
              <p className="text-sm text-muted-foreground">
                Sign out of your Clarity account
              </p>
            </div>
            <SignOutButton />
          </div>
        </CardContent>
      </Card>

      {/* Gmail */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4" />
            Gmail Integration
          </CardTitle>
          <CardDescription>
            Connect your Gmail to automatically scan for receipts and invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Status</p>
              <p className="text-sm text-muted-foreground">
                {gmailConnection
                  ? `Connected · last synced ${gmailConnection.last_synced_at ? new Date(gmailConnection.last_synced_at).toLocaleDateString() : 'never'}`
                  : 'Not connected'}
              </p>
            </div>
            <Badge variant={gmailConnection ? 'default' : 'outline'}>
              {gmailConnection ? 'Connected' : 'Not connected'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-4 p-3 bg-muted rounded-md">
            Gmail integration coming soon — you&apos;ll be able to connect your inbox to automatically import receipts and detect subscriptions.
          </p>
        </CardContent>
      </Card>

      {/* Receipt Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="h-4 w-4" />
            Receipt Upload
          </CardTitle>
          <CardDescription>
            Upload JPG, PNG, or PDF receipts for AI-powered extraction
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground p-3 bg-muted rounded-md">
            Receipt upload coming soon — drag and drop receipts to have Claude extract merchant, amount, and category automatically.
          </p>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4" />
            Security
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Row-level security</p>
              <p className="text-sm text-muted-foreground">
                Your data is private — only you can access it
              </p>
            </div>
            <Badge variant="secondary">Enabled</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
