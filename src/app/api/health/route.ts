import { NextResponse } from "next/server";

// Health check endpoint for uptime monitoring and dashboard status
export async function GET() {
  return NextResponse.json({ status: "ok" }, { status: 200 });
}
