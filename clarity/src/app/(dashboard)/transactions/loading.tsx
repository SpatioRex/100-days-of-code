import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function TransactionsLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Skeleton className="h-7 w-36 mb-1" />
        <Skeleton className="h-4 w-48" />
      </div>

      <Card>
        <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
        <CardContent className="space-y-4">
          {/* Date preset buttons */}
          <div className="flex flex-wrap gap-2">
            {[80, 88, 104, 64].map((w, i) => (
              <Skeleton key={i} className="h-7 rounded-md" style={{ width: w }} />
            ))}
            <Skeleton className="h-7 w-28 rounded-md" />
            <Skeleton className="h-7 w-8 rounded-md" />
            <Skeleton className="h-7 w-28 rounded-md" />
          </div>

          {/* Search + filter row */}
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-9 flex-1 min-w-48 rounded-md" />
            <Skeleton className="h-9 w-40 rounded-md" />
            <Skeleton className="h-9 w-32 rounded-md" />
          </div>

          {/* Results count */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-20" />
          </div>

          {/* Table rows */}
          <div className="rounded-lg border overflow-hidden">
            <div className="border-b bg-muted/40 px-4 py-3 flex gap-4">
              {[120, 80, 90, 70, 60].map((w, i) => (
                <Skeleton key={i} className="h-4 rounded" style={{ width: w }} />
              ))}
            </div>
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 border-b last:border-0">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-14 ml-auto" />
                <Skeleton className="h-7 w-7 rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
