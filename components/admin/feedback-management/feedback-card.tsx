"use client";

import { Mail, User } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { FeedbackStatus, FeedbackType } from "@/db/schema";
import {
  FEEDBACK_STATUS_VARIANTS,
  FEEDBACK_TYPE_LABELS,
  feedbackStatusOptions,
} from "@/lib/constants";
import { formatDateShort } from "@/lib/utils";
import { updateFeedbackStatus } from "@/server/feedback";

type FeedbackCardProps = {
  feedback: {
    id: string;
    type: FeedbackType;
    status: FeedbackStatus;
    subject: string;
    message: string;
    email: string | null;
    createdAt: Date;
    updatedAt: Date;
    user: {
      id: string;
      name: string;
      email: string;
    } | null;
  };
};

export function FeedbackCard({ feedback }: FeedbackCardProps) {
  const [isPending, startTransition] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<FeedbackStatus | null>(
    null,
  );
  const [note, setNote] = useState("");

  const handleStatusSelect = (newStatus: FeedbackStatus) => {
    if (newStatus === feedback.status) return;
    setPendingStatus(newStatus);
    setIsDialogOpen(true);
  };

  const handleConfirmChange = () => {
    if (!pendingStatus) return;

    startTransition(async () => {
      const result = await updateFeedbackStatus(
        feedback.id,
        pendingStatus,
        note.trim() || undefined,
      );

      if (result.success) {
        toast.success("Status updated successfully");
        setIsDialogOpen(false);
        setNote("");
        setPendingStatus(null);
      } else {
        toast.error(result.error || "Failed to update status");
      }
    });
  };

  const handleCancelChange = () => {
    setIsDialogOpen(false);
    setNote("");
    setPendingStatus(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {FEEDBACK_TYPE_LABELS[feedback.type]}
            </Badge>
            <Badge
              variant={FEEDBACK_STATUS_VARIANTS[feedback.status]}
              className="text-xs"
            >
              {feedback.status}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatDateShort(feedback.createdAt)}
            </span>
          </div>
          <h3 className="font-semibold text-base">{feedback.subject}</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {feedback.message}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={feedback.status}
            onValueChange={handleStatusSelect}
            disabled={isPending}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {feedbackStatusOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isPending && <Spinner className="size-4" />}
        </div>
      </div>
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <User className="size-3.5" />
          <span>{feedback.user?.name || "Unknown User"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Mail className="size-3.5" />
          <span>{feedback.email || feedback.user?.email || "No email"}</span>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Feedback Status</DialogTitle>
            <DialogDescription>
              Changing status from{" "}
              <span className="font-semibold">{feedback.status}</span> to{" "}
              <span className="font-semibold">{pendingStatus}</span>. Optionally
              add a note about this change.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label
              htmlFor="status-note"
              className="text-sm font-medium text-muted-foreground"
            >
              Note (optional)
            </label>
            <Textarea
              id="status-note"
              placeholder="e.g., Fixed in version 2.1, Duplicate of #123, etc."
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              disabled={isPending}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancelChange}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmChange} disabled={isPending}>
              {isPending ? (
                <>
                  <Spinner />
                  Applying...
                </>
              ) : (
                "Confirm Change"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
