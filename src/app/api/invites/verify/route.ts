import { verifyInvite } from "@/app/actions/invite";
import { NextRequest, NextResponse } from "next/server";
import { marshalTypedData } from "@/lib/utils/serialize";

export async function POST(request: NextRequest) {
  try {
    console.log("POST /api/invites/verify - Starting request");
    const body = await request.json();
    console.log("Request body:", body);

    if (!body.code) {
      console.error("Missing required fields: code");
      return NextResponse.json({ error: "Missing required fields: code" }, { status: 400 });
    }

    console.log("Verifying invite code:", body.code);
    const result = await verifyInvite(body.code);
    console.log("Verification result:", result);

    if (result.error) {
      console.log("Verification failed with error:", result.error);
      return NextResponse.json(result, { status: 400 });
    }

    console.log("Verification successful, returning result");

    // Use marshalTypedData to properly serialize BigInt values
    const serializedResult = {
      ...result,
      typedData: result.typedData ? marshalTypedData(result.typedData) : result.typedData,
    };

    return NextResponse.json(serializedResult);
  } catch (error) {
    console.error("Error in /api/invites/verify (POST):", error);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
