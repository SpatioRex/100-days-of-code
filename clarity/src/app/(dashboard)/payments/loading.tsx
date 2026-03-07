import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function PaymentsLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Skeleton className="h-7 w-32 mb-1" />
        <Skeleton className="h-4 w-52" />
      </div>

      {/* Totals row */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 mb-1" />
              <Skeleton className="h-3 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Payment cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <div className="mt-4 pt-3 border-t flex items-center justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-5 w-14" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
