'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function DeleteAccountButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [loading, setLoading] = useState(false)

  const CONFIRMATION_PHRASE = 'delete my account'
  const confirmed = confirmation.toLowerCase() === CONFIRMATION_PHRASE

  async function handleDelete() {
    if (!confirmed) return
    setLoading(true)
    try {
      const res = await fetch('/api/auth/delete-account', { method: 'DELETE' })
      if (!res.ok) {
        const j = await res.json()
        toast.error(j.error ?? 'Failed to delete account')
        return
      }
      toast.success('Account deleted. Goodbye!')
      router.push('/')
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setConfirmation('') }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive gap-1.5">
          <Trash2 className="h-3.5 w-3.5" />
          Delete account
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete account</DialogTitle>
          <DialogDescription>
            This permanently deletes your account and all associated data — transactions, connected
            accounts, and preferences. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Label htmlFor="confirm-delete">
            Type <span className="font-semibold text-foreground">{CONFIRMATION_PHRASE}</span> to confirm
          </Label>
          <Input
            id="confirm-delete"
            placeholder={CONFIRMATION_PHRASE}
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            autoComplete="off"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!confirmed || loading}
          >
            {loading && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            Permanently delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
