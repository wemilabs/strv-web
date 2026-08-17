import { Suspense } from "react";
import { FeedbackList } from "@/components/admin/feedback-management/feedback-list";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getAllFeedback } from "@/data/feedback";

async function AdminFeedbackContent() {
  const allFeedback = await getAllFeedback();

  const stats = {
    total: allFeedback.length,
    pending: allFeedback.filter(f => f.status === "pending").length,
    reviewing: allFeedback.filter(f => f.status === "reviewing").length,
    completed: allFeedback.filter(f => f.status === "completed").length,
    rejected: allFeedback.filter(f => f.status === "rejected").length,
  };

  return (
    <div className="space-y-7">
      <div className="grid gap-4 md:grid-cols-5">
        {Object.entries(stats).map(([key, value]) => (
          <Card key={key}>
            <CardHeader className="pb-2">
              <CardDescription className="capitalize">{key}</CardDescription>
              <CardTitle className="text-3xl">{value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Feedback</CardTitle>
          <CardDescription className="font-mono tracking-tighter">
            Manage and review feedback from users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense
            fallback={
              <div className="text-center text-muted-foreground py-8 font-mono tracking-tighter">
                Loading feedback...
              </div>
            }
          >
            <FeedbackList feedback={allFeedback} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

function AdminFeedbackSkeleton() {
  return (
    <div className="space-y-7">
      <div className="grid gap-4 md:grid-cols-5">
        {[1, 2, 3, 4, 5].map(i => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="size-8" />
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8 font-mono tracking-tighter">
            Loading feedback...
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function FeedbackManagementPage() {
  return (
    <Suspense fallback={<AdminFeedbackSkeleton />}>
      <AdminFeedbackContent />
    </Suspense>
  );
}
