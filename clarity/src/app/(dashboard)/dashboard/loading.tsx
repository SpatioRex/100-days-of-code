import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-8 w-24" />
      </div>

      {/* Connect accounts card */}
      <Card>
        <CardHeader><Skeleton className="h-5 w-36" /></CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-4 rounded" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary stats — 3 cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 mb-1" />
              <Skeleton className="h-3 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Overhead card */}
      <Card>
        <CardHeader><Skeleton className="h-5 w-28" /></CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="space-y-1.5">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-3 w-14" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Categories */}
      <Card>
        <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
        <CardContent className="space-y-4">
          {[80, 55, 40, 25].map((w, i) => (
            <div key={i}>
              <div className="flex justify-between mb-1">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" style={{ maxWidth: `${w}%` }} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Recent transactions */}
      <Card>
        <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
        <CardContent className="space-y-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-4 w-14" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
