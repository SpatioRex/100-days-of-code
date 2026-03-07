'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  hasGmail: boolean
  hasBank: boolean
}

export function SyncAllButton({ hasGmail, hasBank }: Props) {
  const [syncing, setSyncing] = useState(false)

  async function syncAll() {
    if (!hasGmail && !hasBank) {
      toast.error('No accounts connected yet')
      return
    }

    setSyncing(true)
    const toastId = toast.loading('Syncing your accounts…')

    try {
      const results = await Promise.allSettled([
        hasBank ? fetch('/api/plaid/sync', { method: 'POST' }).then(r => r.json()) : null,
        hasGmail ? fetch('/api/gmail/sync', { method: 'POST' }).then(r => r.json()) : null,
      ])

      const [bankResult, gmailResult] = results

      let bankSynced = 0
      let gmailSynced = 0
      const errors: string[] = []

      if (hasBank) {
        if (bankResult.status === 'fulfilled' && bankResult.value?.synced !== undefined) {
          bankSynced = bankResult.value.synced
        } else {
          const msg = bankResult.status === 'fulfilled' ? bankResult.value?.error : bankResult.reason?.message
          errors.push(`Bank: ${msg ?? 'unknown error'}`)
        }
      }

      if (hasGmail) {
        if (gmailResult.status === 'fulfilled' && gmailResult.value?.synced !== undefined) {
          gmailSynced = gmailResult.value.synced
        } else {
          const msg = gmailResult.status === 'fulfilled' ? gmailResult.value?.error : gmailResult.reason?.message
          errors.push(`Gmail: ${msg ?? 'unknown error'}`)
        }
      }

      toast.dismiss(toastId)

      if (errors.length > 0 && bankSynced === 0 && gmailSynced === 0) {
        toast.error(errors.join(' · '), { duration: 10000 })
      } else {
        const total = bankSynced + gmailSynced
        toast.success(
          total > 0
            ? `Synced ${total} new transaction${total !== 1 ? 's' : ''}`
            : 'Already up to date!'
        )
        // Refresh the page to show new transactions
        if (total > 0) window.location.reload()
      }
    } catch {
      toast.dismiss(toastId)
      toast.error('Sync failed — please try again')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={syncAll}
      disabled={syncing || (!hasGmail && !hasBank)}
    >
      <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${syncing ? 'animate-spin' : ''}`} />
      {syncing ? 'Syncing…' : 'Sync All'}
    </Button>
  )
}
