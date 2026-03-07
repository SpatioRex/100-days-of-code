import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/sidebar'
import { getUserPlan } from '@/lib/subscription'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const plan = await getUserPlan(user.id, supabase)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar userEmail={user.email} plan={plan} />
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto max-w-6xl px-6 py-8 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  )
}
