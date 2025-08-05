import { addLeaderViaSignedTypedData } from "@/app/actions/defender";
import { NextRequest, NextResponse } from "next/server";
import { isAddress } from "viem";

// Force static generation for mobile builds
export const dynamic = "force-static";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.recipient) {
      return NextResponse.json({ error: "Missing required fields: recipient" }, { status: 400 });
    }

    if (!body.typedData) {
      return NextResponse.json({ error: "Missing required fields: typedData" }, { status: 400 });
    }

    if (!body.signature) {
      return NextResponse.json({ error: "Missing required fields: signature" }, { status: 400 });
    }

    if (!body.deviceInfo) {
      return NextResponse.json({ error: "Missing required fields: deviceInfo" }, { status: 400 });
    }

    if (!body.typedData.message.recipient || !isAddress(body.typedData.message.recipient)) {
      return NextResponse.json(
        { error: "Missing required fields: recipient (should be a valid address)" },
        { status: 400 }
      );
    }

    const result = await addLeaderViaSignedTypedData(
      body.recipient,
      body.typedData,
      body.signature,
      body.deviceInfo
    );

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in /api/members (POST):", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
