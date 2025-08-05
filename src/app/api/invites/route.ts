import { createInvite } from "@/app/actions/invite";
import { NextRequest, NextResponse } from "next/server";
import { isAddress } from "viem";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // inviterAddress: string,
    // signature: string,
    // nonce: string,
    // typedData: any,
    // deviceInfo?: Partial<DeviceInfo>

    if (!body.inviterAddress || !isAddress(body.inviterAddress)) {
      return NextResponse.json(
        { error: "Missing required fields: inviterAddress (should be a valid address)" },
        { status: 400 }
      );
    }

    if (!body.signature) {
      return NextResponse.json({ error: "Missing required fields: signature" }, { status: 400 });
    }

    if (!body.nonce) {
      return NextResponse.json({ error: "Missing required fields: nonce" }, { status: 400 });
    }

    if (!body.typedData) {
      return NextResponse.json({ error: "Missing required fields: typedData" }, { status: 400 });
    }

    if (!body.deviceInfo) {
      return NextResponse.json({ error: "Missing required fields: deviceInfo" }, { status: 400 });
    }

    const result = await createInvite(
      body.inviterAddress,
      body.signature,
      body.nonce,
      body.typedData,
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
