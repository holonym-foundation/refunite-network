import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.address) {
      return NextResponse.json({ error: "Missing required field: address" }, { status: 400 });
    }

    if (!body.confirmationPhrase) {
      return NextResponse.json(
        { error: "Missing required field: confirmationPhrase" },
        { status: 400 }
      );
    }

    // Validate the confirmation phrase
    if (body.confirmationPhrase !== "delete me") {
      return NextResponse.json(
        { error: "Invalid confirmation phrase. Please type exactly: delete me" },
        { status: 400 }
      );
    }

    // TODO: Implement actual deletion logic
    // This is where you would:
    // 1. Queue the account for deletion
    // 2. Store the deletion request in a database
    // 3. Send notification to admin/support team
    // 4. Schedule the actual deletion for 72 hours from now

    console.log(`Delete request received for address: ${body.address}`);

    return NextResponse.json({
      success: true,
      message: "Your delete request was received, we'll delete your account within 72 hours",
    });
  } catch (error) {
    console.error("Error processing delete request:", error);
    return NextResponse.json(
      { error: "Failed to process delete request. Please try again." },
      { status: 500 }
    );
  }
}
