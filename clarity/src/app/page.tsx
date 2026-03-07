import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import {
  Mail,
  Building2,
  ScanLine,
  Bell,
  LayoutDashboard,
  RefreshCw,
  ArrowRight,
  Check,
} from 'lucide-react'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Nav */}
      <header className="border-b">
        <div className="mx-auto max-w-5xl px-6 h-14 flex items-center justify-between">
          <span className="font-semibold tracking-tight">Clarity</span>
          <nav className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/signup">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-6 pt-24 pb-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border bg-muted px-3 py-1 text-xs text-muted-foreground mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            Free during beta
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight mb-5">
            Know exactly where<br className="hidden sm:block" /> your money goes
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
            Clarity connects your bank, scans your email receipts, and surfaces
            subscriptions you forgot about — so you can cancel what you don&apos;t need.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" className="w-full sm:w-auto gap-2" asChild>
              <Link href="/signup">
                Start for free <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
              <Link href="/login">I already have an account</Link>
            </Button>
          </div>
        </section>

        {/* Feature grid */}
        <section className="mx-auto max-w-5xl px-6 pb-20">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<Building2 className="h-5 w-5" />}
              title="Bank sync"
              description="Connect your bank via Plaid and see every transaction automatically imported and categorised."
            />
            <FeatureCard
              icon={<Mail className="h-5 w-5" />}
              title="Gmail receipts"
              description="Authorise Gmail read-only access and Clarity extracts transactions from your receipt emails."
            />
            <FeatureCard
              icon={<ScanLine className="h-5 w-5" />}
              title="Receipt upload"
              description="Snap a photo or drag in a PDF — Claude reads the merchant, amount, and date instantly."
            />
            <FeatureCard
              icon={<RefreshCw className="h-5 w-5" />}
              title="Subscription tracker"
              description="See every recurring charge grouped by service with direct cancel links for 55+ providers."
            />
            <FeatureCard
              icon={<LayoutDashboard className="h-5 w-5" />}
              title="Customisable dashboard"
              description="Drag, reorder, and hide cards so your most important numbers are always front and centre."
            />
            <FeatureCard
              icon={<Bell className="h-5 w-5" />}
              title="Smart alerts"
              description="Get notified when a new subscription is detected or a large transaction hits your accounts."
            />
          </div>
        </section>

        {/* Social proof / trust strip */}
        <section className="border-t bg-muted/40">
          <div className="mx-auto max-w-5xl px-6 py-10 flex flex-col sm:flex-row items-center justify-center gap-8 text-sm text-muted-foreground">
            <TrustItem text="Bank-level security via Plaid" />
            <TrustItem text="Gmail read-only — we never store emails" />
            <TrustItem text="Your data is private by default" />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto max-w-5xl px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Clarity</span>
          <nav className="flex items-center gap-4">
            <Link href="/legal/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link href="/legal/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="font-semibold text-sm">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}

function TrustItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2">
      <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
      <span>{text}</span>
    </div>
  )
}
