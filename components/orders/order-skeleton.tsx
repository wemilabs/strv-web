import { Skeleton } from "../ui/skeleton";

export function OrdersPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Tabs List Skeleton */}
      <div className="w-full max-w-md mx-auto">
        <div className="grid grid-cols-2 gap-1 p-1 bg-muted rounded-lg">
          <div className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-md bg-background shadow-sm">
            <Skeleton className="size-4" />
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-5 w-6 rounded-full" />
          </div>
          <div className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-md">
            <Skeleton className="size-4" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-6 rounded-full" />
          </div>
        </div>
      </div>

      {/* Tab Content Skeleton */}
      <div className="space-y-6">
        {/* Order Stats Skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="rounded-lg border p-4 space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-8 w-12" />
            </div>
          ))}
        </div>

        {/* Order List Skeleton */}
        <div className="space-y-4">
          <div className="text-center text-muted-foreground py-8 font-mono tracking-tighter">
            Loading orders...
          </div>
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-lg border p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <Skeleton className="h-5 w-20 ml-auto" />
                  <Skeleton className="h-4 w-16 ml-auto" />
                </div>
              </div>
              <div className="border-t pt-4">
                <div className="space-y-3">
                  {[1, 2].map(j => (
                    <div key={j} className="flex items-center gap-3">
                      <Skeleton className="size-12 rounded-md" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
