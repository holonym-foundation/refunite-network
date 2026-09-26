import { submitFeedback } from "@/app/actions/feedback";
import { getSessionAddress } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Anyone may send feedback, so bound what reaches Slack. (No rate limiting yet.)
const feedbackSchema = z.object({
  sentiment: z.enum(["up", "down"]).nullable(),
  feedback: z.string().trim().min(1).max(2000),
  page: z.string().max(200).default("unknown"),
  deviceInfo: z.record(z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = feedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid feedback: sentiment (up/down), feedback (1-2000 chars), page" },
      { status: 400 }
    );
  }

  // Only a signed-in session proves who sent it; a client-supplied address is not trusted
  const user = getSessionAddress(request) ?? "anonymous";

  const result = await submitFeedback({ ...parsed.data, user });
  return NextResponse.json(result, { status: result.success ? 200 : 502 });
}
