import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

function CardSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export default function SettingsLoading() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Skeleton className="h-7 w-24 mb-1" />
        <Skeleton className="h-4 w-52" />
      </div>
      <CardSkeleton rows={3} />
      <CardSkeleton rows={2} />
      <CardSkeleton rows={2} />
      <CardSkeleton rows={1} />
      <CardSkeleton rows={4} />
      <CardSkeleton rows={1} />
    </div>
  )
}
