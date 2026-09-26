import { verifyInvite } from "@/app/actions/invite";
import { NextRequest, NextResponse } from "next/server";
import { marshalTypedData } from "@/lib/utils/serialize";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.code) {
      console.error("Missing required fields: code");
      return NextResponse.json({ error: "Missing required fields: code" }, { status: 400 });
    }
    const result = await verifyInvite(body.code);

    if (result.error) {
      console.warn("Invite verification failed:", result.error);
      return NextResponse.json(result, { status: 400 });
    }

    // Use marshalTypedData to properly serialize BigInt values
    const serializedResult = {
      ...result,
      typedData: result.typedData ? marshalTypedData(result.typedData) : result.typedData,
    };

    return NextResponse.json(serializedResult);
  } catch (error) {
    console.error("Error in /api/invites/verify (POST):", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
