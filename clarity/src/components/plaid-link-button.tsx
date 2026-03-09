'use client'

import { useState, useCallback, useEffect } from 'react'
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

// Inner component — only mounted when we have a token, so usePlaidLink is
// only called once per click (not on every PlaidLinkButton on the page).
function PlaidLinkOpener({
  token,
  onSuccess,
  onExit,
}: {
  token: string
  onSuccess: (public_token: string, metadata: any) => void
  onExit: () => void
}) {
  // After an OAuth bank login (Chase, BoA, etc.), Plaid redirects back to our
  // app with ?oauth_state_id=... in the URL. We must pass receivedRedirectUri
  // so Plaid can pick up the flow where it left off.
  const receivedRedirectUri =
    typeof window !== 'undefined' &&
    window.location.search.includes('oauth_state_id')
      ? window.location.href
      : undefined

  const { open, ready } = usePlaidLink({
    token,
    onSuccess,
    onExit,
    receivedRedirectUri,
  })

  useEffect(() => {
    if (ready) open()
  }, [ready, open])

  return null
}

export function PlaidLinkButton({
  variant = 'default',
  className,
  label = 'Connect Bank Account',
}: PlaidLinkButtonProps) {
  const router = useRouter()
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // On mount: if this is a post-OAuth redirect (Plaid sends user back with
  // ?oauth_state_id=...), restore the saved link token and re-open Plaid Link.
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      window.location.search.includes('oauth_state_id')
    ) {
      const saved = sessionStorage.getItem('plaid_link_token')
      if (saved) {
        sessionStorage.removeItem('plaid_link_token')
        setLinkToken(saved)
        setLoading(true)
      }
    }
  }, [])

  const onSuccess = useCallback(
    async (public_token: string, metadata: any) => {
      setLinkToken(null)

      // Clean up OAuth query params from the URL so they don't linger
      if (
        typeof window !== 'undefined' &&
        window.location.search.includes('oauth_state_id')
      ) {
        window.history.replaceState({}, '', window.location.pathname)
      }

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
        if (syncData.synced != null) {
          toast.success(`Imported ${syncData.synced} transactions`)
        }
        router.refresh()
      } catch (err: any) {
        toast.error(err.message ?? 'Failed to connect bank')
      } finally {
        setLoading(false)
      }
    },
    [router]
  )

  const onExit = useCallback(() => {
    setLinkToken(null)
    setLoading(false)
  }, [])

  async function handleClick() {
    setLoading(true)
    try {
      const res = await fetch('/api/plaid/create-link-token', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // Persist token in sessionStorage so we can restore it after the
      // OAuth bank redirect (user leaves and returns to the app)
      sessionStorage.setItem('plaid_link_token', data.link_token)
      setLinkToken(data.link_token)
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to open bank connection')
      setLoading(false)
    }
  }

  return (
    <>
      {/* Only mount PlaidLinkOpener (and thus call usePlaidLink) when we have
          a token — prevents Plaid script from loading N times per page */}
      {linkToken && (
        <PlaidLinkOpener token={linkToken} onSuccess={onSuccess} onExit={onExit} />
      )}
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
    </>
  )
}
