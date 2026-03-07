'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { RotateCcw } from 'lucide-react'

export default function DashboardError({
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
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <p className="text-5xl font-bold text-muted-foreground/30 mb-4">Oops</p>
      <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        This page ran into an unexpected error. Your data is safe — try refreshing or click below.
      </p>
      <Button onClick={reset} className="gap-2">
        <RotateCcw className="h-4 w-4" />
        Try again
      </Button>
    </div>
  )
}
