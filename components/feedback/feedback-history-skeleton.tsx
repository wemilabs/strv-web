import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Skeleton } from "../ui/skeleton";

export function FeedbackHistorySkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Feedback History</CardTitle>
        <CardDescription>
          Track the status of your previous submissions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 flex-1 min-w-0">
                  <Skeleton className="h-4 w-3/4" />
                  <div className="flex items-center gap-2 flex-wrap">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-12" />
                  </div>
                </div>
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
