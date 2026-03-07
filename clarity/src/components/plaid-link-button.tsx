'use client'

import { useState, useCallback } from 'react'
import { usePlaidLink } from 'react-plaid-link'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Building2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PlaidLinkButtonProps {
  variant?: 'default' | 'outline'
  className?: string
  label?: string
}

export function PlaidLinkButton({
  variant = 'default',
  className,
  label = 'Connect Bank Account',
}: PlaidLinkButtonProps) {
  const router = useRouter()
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSuccess = useCallback(
    async (public_token: string, metadata: any) => {
      try {
        const res = await fetch('/api/plaid/exchange-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            public_token,
            institution_name: metadata.institution?.name ?? 'Unknown Bank',
            institution_id: metadata.institution?.institution_id ?? '',
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)

        toast.success(`${data.institution_name} connected! Syncing transactions…`)

        // Auto-sync after connecting
        const syncRes = await fetch('/api/plaid/sync', { method: 'POST' })
        const syncData = await syncRes.json()
        toast.success(`Imported ${syncData.synced} transactions`)
        router.refresh()
      } catch (err: any) {
        toast.error(err.message ?? 'Failed to connect bank')
      }
    },
    [router]
  )

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
    onExit: () => setLoading(false),
  })

  async function handleClick() {
    setLoading(true)
    try {
      const res = await fetch('/api/plaid/create-link-token', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setLinkToken(data.link_token)
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to open bank connection')
      setLoading(false)
    }
  }

  // Once we have a token and Plaid Link is ready, open it
  if (linkToken && ready) {
    open()
  }

  return (
    <Button
      variant={variant}
      className={className}
      onClick={handleClick}
      disabled={loading}
    >
      {loading
        ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
        : <Building2 className="h-4 w-4 mr-2" />}
      {label}
    </Button>
  )
}
