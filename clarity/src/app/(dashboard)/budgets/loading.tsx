import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'

export default function BudgetsLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>

      {/* Summary bar */}
      <Card>
        <CardContent className="pt-5 pb-4 space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-4 w-8" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </CardContent>
      </Card>

      {/* Budget cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-5 pb-4 space-y-3">
              <div className="flex justify-between">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-5 w-12" />
              </div>
              <div className="flex justify-between items-baseline">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
              <div className="flex justify-between">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Scan card */}
      <Card>
        <CardContent className="pt-5 pb-4 space-y-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-72" />
          <Skeleton className="h-9 w-28" />
        </CardContent>
      </Card>
    </div>
  )
}
