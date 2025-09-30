import { sendFeedbackMessage } from "@/lib/slack/webhook";

interface FeedbackInput {
  sentiment: "up" | "down" | null;
  feedback: string;
  user?: string;
  page?: string;
  deviceInfo?: Record<string, any>;
}

export async function submitFeedback({
  sentiment,
  feedback,
  user,
  page,
  deviceInfo,
}: FeedbackInput) {
  try {
    await sendFeedbackMessage({
      sentiment,
      feedback,
      user: user || "anonymous",
      page: page || "unknown",
      deviceInfo,
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
