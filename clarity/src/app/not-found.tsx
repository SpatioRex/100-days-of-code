import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <p className="text-6xl font-bold text-muted-foreground/30 mb-4">404</p>
      <h1 className="text-xl font-semibold mb-2">Page not found</h1>
      <p className="text-sm text-muted-foreground mb-8 max-w-xs">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Button asChild>
        <Link href="/" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
      </Button>
    </div>
  )
}
