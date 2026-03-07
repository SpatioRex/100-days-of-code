'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { RotateCcw } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <p className="text-6xl font-bold text-muted-foreground/30 mb-4">500</p>
      <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
      <p className="text-sm text-muted-foreground mb-8 max-w-xs">
        An unexpected error occurred. Please try again — if it keeps happening, contact support.
      </p>
      <Button onClick={reset} className="gap-2">
        <RotateCcw className="h-4 w-4" />
        Try again
      </Button>
    </div>
  )
}
