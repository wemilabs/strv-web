"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/data/user-session";
import { db } from "@/db/drizzle";
import {
  type FeedbackStatus,
  type FeedbackType,
  feedback,
  feedbackHistory,
} from "@/db/schema";

type SubmitFeedbackInput = {
  type: FeedbackType;
  subject: string;
  message: string;
  email?: string;
};

export async function submitFeedback(data: SubmitFeedbackInput) {
  const sessionData = await verifySession();

  if (!sessionData.success) {
    return {
      success: false,
      error: "You must be signed in to submit feedback",
    };
  }

  try {
    await db.insert(feedback).values({
      userId: sessionData.session.user.id,
      type: data.type,
      subject: data.subject,
      message: data.message,
      email: data.email || sessionData.session.user.email,
      status: "pending",
    });

    revalidatePath("/feedback");

    return {
      success: true,
      message: "Thank you for your feedback! We'll review it soon.",
    };
  } catch (error) {
    console.error("Error submitting feedback:", error);
    return {
      success: false,
      error: "Failed to submit feedback. Please try again.",
    };
  }
}

export async function updateFeedbackStatus(
  feedbackId: string,
  newStatus: FeedbackStatus,
  note?: string,
) {
  const sessionData = await verifySession();

  if (!sessionData.success) {
    return {
      success: false,
      error: "You must be signed in to update feedback status",
    };
  }

  try {
    // Get current feedback to record previous status
    const currentFeedback = await db.query.feedback.findFirst({
      where: eq(feedback.id, feedbackId),
    });

    if (!currentFeedback) {
      return {
        success: false,
        error: "Feedback not found",
      };
    }

    // Skip if status hasn't changed
    if (currentFeedback.status === newStatus) {
      return {
        success: true,
        message: "Status is already set to this value",
      };
    }

    // Record history entry
    await db.insert(feedbackHistory).values({
      feedbackId,
      previousStatus: currentFeedback.status,
      newStatus,
      changedBy: sessionData.session.user.id,
      note,
    });

    // Update feedback status
    await db
      .update(feedback)
      .set({
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(feedback.id, feedbackId));

    revalidatePath("/admin/feedback");
    revalidatePath("/feedback");

    return {
      success: true,
      message: "Feedback status updated successfully",
    };
  } catch (error) {
    console.error("Error updating feedback status:", error);
    return {
      success: false,
      error: "Failed to update feedback status. Please try again.",
    };
  }
}

export async function getFeedbackHistory(feedbackId: string) {
  const sessionData = await verifySession();

  if (!sessionData.success) {
    return {
      success: false,
      error: "You must be signed in to view feedback history",
    };
  }

  try {
    const history = await db.query.feedbackHistory.findMany({
      where: eq(feedbackHistory.feedbackId, feedbackId),
      with: {
        changedByUser: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: (feedbackHistory, { desc }) => [desc(feedbackHistory.changedAt)],
    });

    return {
      success: true,
      data: history,
    };
  } catch (error) {
    console.error("Error fetching feedback history:", error);
    return {
      success: false,
      error: "Failed to fetch feedback history",
    };
  }
}
