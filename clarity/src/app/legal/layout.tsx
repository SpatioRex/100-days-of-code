import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto max-w-3xl px-6 h-14 flex items-center justify-between">
          <Link href="/" className="font-semibold tracking-tight">Clarity</Link>
          <Button variant="ghost" size="sm" className="gap-1.5" asChild>
            <Link href="/"><ArrowLeft className="h-3.5 w-3.5" /> Back</Link>
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-12">
        {children}
      </main>
      <footer className="border-t mt-12">
        <div className="mx-auto max-w-3xl px-6 py-6 flex items-center justify-between text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Clarity</span>
          <nav className="flex gap-4">
            <Link href="/legal/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/legal/terms" className="hover:text-foreground transition-colors">Terms</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
