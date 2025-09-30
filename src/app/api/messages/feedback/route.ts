import { submitFeedback } from "@/app/actions/feedback";
import { NextRequest, NextResponse } from "next/server";

// TOOD: we could add rate limiting to prevent spam
export async function POST(request: NextRequest) {
  const body = await request.json();

  //   sentiment,
  //   feedback,
  //   user: user || "anonymous",
  //   page: page || "unknown",
  //   deviceInfo,

  if (!body.sentiment) {
    return NextResponse.json({ error: "Missing required fields: sentiment" }, { status: 400 });
  }

  if (!body.feedback) {
    return NextResponse.json({ error: "Missing required fields: feedback" }, { status: 400 });
  }

  if (!body.user) {
    return NextResponse.json({ error: "Missing required fields: user" }, { status: 400 });
  }

  if (!body.page) {
    return NextResponse.json({ error: "Missing required fields: page" }, { status: 400 });
  }

  if (!body.deviceInfo) {
    return NextResponse.json({ error: "Missing required fields: deviceInfo" }, { status: 400 });
  }

  const result = await submitFeedback(body);

  console.log(body);
  return NextResponse.json(result);
}
