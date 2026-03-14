'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Building2, Loader2, RefreshCw, Trash2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { PlaidLinkButton } from '@/components/plaid-link-button'
import { format } from 'date-fns'

interface BankConnection {
  id: string
  institution_name: string
  last_synced_at: string | null
}

interface BankCardProps {
  connections: BankConnection[]
}

export function BankCard({ connections }: BankCardProps) {
  const router = useRouter()
  const [syncing, setSyncing] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  async function handleSync() {
    setSyncing(true)
    try {
      const res = await fetch('/api/plaid/sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      if (data.product_not_ready) {
        toast.info('Your bank is still preparing transactions. Try again in 1–2 minutes.')
      } else {
        toast.success(`Synced ${data.synced} new transaction${data.synced !== 1 ? 's' : ''}`)
      }
      router.refresh()
    } catch (err: any) {
      toast.error(err.message ?? 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  async function handleRemove(id: string) {
    setRemovingId(id)
    try {
      const res = await fetch('/api/plaid/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connection_id: id }),
      })
      if (!res.ok) throw new Error('Failed to disconnect')
      toast.success('Bank account disconnected')
      router.refresh()
    } catch {
      toast.error('Failed to disconnect bank account')
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="h-4 w-4" />
          Bank Accounts
        </CardTitle>
        <CardDescription>
          Connect your bank to automatically import real transactions via Plaid
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {connections.length === 0 ? (
          <p className="text-sm text-muted-foreground">No bank accounts connected yet.</p>
        ) : (
          <div className="space-y-3">
            {connections.map((conn, i) => (
              <div key={conn.id}>
                {i > 0 && <Separator className="mb-3" />}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{conn.institution_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Last synced:{' '}
                      {conn.last_synced_at
                        ? format(new Date(conn.last_synced_at), 'MMM d, yyyy h:mm a')
                        : 'Never'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Connected</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleRemove(conn.id)}
                      disabled={removingId === conn.id}
                    >
                      {removingId === conn.id
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <Trash2 className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <PlaidLinkButton
            variant={connections.length === 0 ? 'default' : 'outline'}
            className="flex-1"
            label={connections.length === 0 ? 'Connect Bank Account' : '+ Add Another Bank'}
          />
          {connections.length > 0 && (
            <Button variant="outline" onClick={handleSync} disabled={syncing} className="gap-2">
              {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Sync Now
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Powered by Plaid. Clarity never stores your bank credentials — only read-only access tokens.
        </p>
      </CardContent>
    </Card>
  )
}
