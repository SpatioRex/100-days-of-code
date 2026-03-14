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
        if (bankResult.status === 'fulfilled' && bankResult.value?.product_not_ready) {
          errors.push('Bank: transactions still being prepared — try again in 1–2 minutes')
        } else if (bankResult.status === 'fulfilled' && bankResult.value?.synced !== undefined) {
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

      // Check if any accounts need to be reconnected
      const reauthNeeded: string[] = []
      if (gmailResult.status === 'fulfilled' && gmailResult.value?.needsReauth?.length) {
        reauthNeeded.push(...gmailResult.value.needsReauth)
      }

      if (errors.length > 0 && bankSynced === 0 && gmailSynced === 0 && reauthNeeded.length === 0) {
        toast.error(errors.join(' · '), { duration: 10000 })
      } else {
        const total = bankSynced + gmailSynced
        if (total > 0) {
          toast.success(`Synced ${total} new transaction${total !== 1 ? 's' : ''}`)
          window.location.reload()
        } else {
          toast.success('Already up to date!')
        }
        // Show reauth warning separately so it's not dismissed with the success toast
        if (reauthNeeded.length > 0) {
          setTimeout(() => {
            toast.warning(`${reauthNeeded.join(', ')} needs to be reconnected — go to Email Accounts and disconnect/reconnect.`, { duration: 12000 })
          }, 500)
        }
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
