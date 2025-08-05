import { NextResponse } from "next/server";

// Force static generation for mobile builds
export const dynamic = "force-static";

// Health check endpoint for uptime monitoring and dashboard status
export async function GET() {
  return NextResponse.json({ status: "ok" }, { status: 200 });
}
