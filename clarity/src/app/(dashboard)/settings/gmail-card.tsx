'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail, RefreshCw, Trash2, CheckCircle2, Plus, Loader2, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface EmailConnection {
  id: string
  email: string | null
  provider: string
  last_synced_at: string | null
}

const PROVIDER_LABELS: Record<string, string> = {
  gmail: 'Gmail',
  yahoo: 'Yahoo Mail',
}

const PROVIDER_COLORS: Record<string, string> = {
  gmail: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  yahoo: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

interface Props {
  connections: EmailConnection[]
  successParam?: string
  errorParam?: string
}

export function GmailCard({ connections: initial, successParam, errorParam }: Props) {
  const [connections, setConnections] = useState(initial)
  const [syncing, setSyncing] = useState(false)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  // When multiple accounts are connected, show a collapsed summary by default
  const [expanded, setExpanded] = useState(false)

  // Yahoo connect dialog state
  const [yahooDialogOpen, setYahooDialogOpen] = useState(false)
  const [yahooEmail, setYahooEmail] = useState('')
  const [yahooAppPassword, setYahooAppPassword] = useState('')
  const [yahooConnecting, setYahooConnecting] = useState(false)

  useEffect(() => {
    if (successParam === 'gmail_connected') toast.success('Gmail account connected!')
    if (successParam === 'yahoo_connected') toast.success('Yahoo Mail account connected!')
    if (errorParam === 'gmail_denied' || errorParam === 'yahoo_denied') toast.error('Access was denied')
    if (errorParam === 'gmail_oauth_failed' || errorParam === 'yahoo_oauth_failed') toast.error('Connection failed — try again')
    if (errorParam === 'gmail_db_error' || errorParam === 'yahoo_db_error') toast.error('Failed to save connection')
    if (errorParam === 'yahoo_not_configured') toast.error('Yahoo Mail not configured yet')
  }, [successParam, errorParam])

  async function syncAll() {
    setSyncing(true)
    try {
      const res = await fetch('/api/gmail/sync', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? 'Sync failed')
      } else {
        if (json.synced > 0) {
          toast.success(`Synced ${json.synced} new transactions`)
        } else {
          toast.success('Already up to date!')
        }
        if (json.needsReauth?.length > 0) {
          toast.warning(`${json.needsReauth.join(', ')} needs to be reconnected — the connection has expired.`)
        }
      }
    } catch { toast.error('Sync failed') }
    finally { setSyncing(false) }
  }

  async function disconnect(connectionId: string, email: string | null) {
    setDisconnecting(connectionId)
    try {
      const res = await fetch('/api/gmail/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId }),
      })
      if (res.ok) {
        setConnections((prev) => prev.filter((c) => c.id !== connectionId))
        toast.success(`Disconnected ${email ?? 'account'}`)
      } else {
        toast.error('Failed to disconnect')
      }
    } catch { toast.error('Failed to disconnect') }
    finally { setDisconnecting(null) }
  }

  async function connectYahoo() {
    if (!yahooEmail.trim() || !yahooAppPassword.trim()) {
      toast.error('Please enter your Yahoo email and app password')
      return
    }
    setYahooConnecting(true)
    try {
      const res = await fetch('/api/yahoo/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: yahooEmail.trim(), appPassword: yahooAppPassword.trim() }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? 'Failed to connect Yahoo Mail')
        return
      }
      toast.success(`${yahooEmail} connected!`)
      setYahooDialogOpen(false)
      setYahooEmail('')
      setYahooAppPassword('')
      // Optimistically add to list
      setConnections(prev => [...prev, {
        id: crypto.randomUUID(),
        email: yahooEmail.trim().toLowerCase(),
        provider: 'yahoo',
        last_synced_at: null,
      }])
    } catch {
      toast.error('Failed to connect Yahoo Mail')
    } finally {
      setYahooConnecting(false)
    }
  }

  const gmailCount = connections.filter(c => c.provider === 'gmail').length
  const yahooCount = connections.filter(c => c.provider === 'yahoo').length

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4" /> Email Accounts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Connect Gmail or Yahoo Mail to scan for receipts and invoices automatically.
          </p>

          {/* Connected accounts */}
          {connections.length > 0 && (
            <div className="space-y-2">
              {/* Collapsed summary when 2+ accounts — click to expand */}
              {connections.length > 1 && (
                <button
                  onClick={() => setExpanded((v) => !v)}
                  className="w-full flex items-center justify-between rounded-lg border p-3 gap-3 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    <span className="text-sm font-medium">
                      {connections.length} email accounts connected
                    </span>
                  </div>
                  {expanded
                    ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                    : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                </button>
              )}

              {/* Individual rows: always visible for single account; shown on expand for multiple */}
              {(connections.length === 1 || expanded) && connections.map((conn) => (
                <div key={conn.id} className="flex items-center justify-between rounded-lg border p-3 gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{conn.email ?? `${PROVIDER_LABELS[conn.provider] ?? conn.provider} account`}</p>
                      <p className="text-xs text-muted-foreground">
                        {conn.last_synced_at
                          ? `Synced ${format(new Date(conn.last_synced_at), 'MMM d, h:mm a')}`
                          : 'Never synced'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${PROVIDER_COLORS[conn.provider] ?? 'bg-muted text-muted-foreground'}`}>
                      {PROVIDER_LABELS[conn.provider] ?? conn.provider}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => disconnect(conn.id, conn.email)}
                      disabled={disconnecting === conn.id}
                    >
                      {disconnecting === conn.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Trash2 className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href="/api/gmail/connect">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                {gmailCount === 0 ? 'Connect Gmail' : 'Add Gmail'}
              </a>
            </Button>

            <Button variant="outline" size="sm" onClick={() => setYahooDialogOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              {yahooCount === 0 ? 'Connect Yahoo Mail' : 'Add Yahoo Mail'}
            </Button>

            {connections.length > 0 && (
              <Button variant="outline" size="sm" onClick={syncAll} disabled={syncing}>
                {syncing
                  ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Syncing…</>
                  : <><RefreshCw className="h-3.5 w-3.5 mr-1.5" />Sync All</>}
              </Button>
            )}
          </div>

          {connections.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Connect multiple accounts — each inbox will be scanned separately for receipts.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Yahoo Mail connect dialog */}
      <Dialog open={yahooDialogOpen} onOpenChange={setYahooDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect Yahoo Mail</DialogTitle>
            <DialogDescription>
              Yahoo requires an app password to connect securely. Your regular Yahoo password won't work here.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="yahoo-email">Yahoo email address</Label>
              <Input
                id="yahoo-email"
                type="email"
                placeholder="you@yahoo.com"
                value={yahooEmail}
                onChange={e => setYahooEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="yahoo-app-password">App password</Label>
              <Input
                id="yahoo-app-password"
                type="password"
                placeholder="xxxx xxxx xxxx xxxx"
                value={yahooAppPassword}
                onChange={e => setYahooAppPassword(e.target.value)}
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Generate one at{' '}
                <a
                  href="https://login.yahoo.com/account/security"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline-offset-4 hover:underline inline-flex items-center gap-0.5"
                >
                  Yahoo Account Security <ExternalLink className="h-3 w-3" />
                </a>
                {' '}→ Generate app password → Other app → "Clarity Finance"
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setYahooDialogOpen(false)} disabled={yahooConnecting}>
              Cancel
            </Button>
            <Button onClick={connectYahoo} disabled={yahooConnecting || !yahooEmail || !yahooAppPassword}>
              {yahooConnecting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
