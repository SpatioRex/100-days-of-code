import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function SubscriptionsLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Skeleton className="h-7 w-40 mb-1" />
        <Skeleton className="h-4 w-56" />
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Subscription list */}
      <Card>
        <CardHeader><Skeleton className="h-5 w-36" /></CardHeader>
        <CardContent className="space-y-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-8 w-24 rounded-md" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
