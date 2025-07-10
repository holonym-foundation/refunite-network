import tursoClient from "@/client/turso";
import { NextRequest, NextResponse } from "next/server";

// POST request to set an invite code as used
export async function POST(request: NextRequest) {
  // check bearer token
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.split(" ")[1];
  if (token !== process.env.RELAYID_APP_API_TOKEN) {
    console.error("Unauthorized token used in call to /api/invites");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { inviterSignature, recipient } = body;

  // Check if the invite code exists and isn't already used
  const inviteResult = await tursoClient.execute(
    "SELECT * FROM invites WHERE inviter_signature = ?",
    [inviterSignature]
  );

  if (inviteResult.rows.length === 0) {
    console.error("Invite code not found", inviterSignature);
    return NextResponse.json({ error: "Invite code not found" }, { status: 404 });
  }

  if (inviteResult.rows[0].used_by || inviteResult.rows[0].used_at) {
    console.error("Invite code already used", inviteResult.rows[0]);
    return NextResponse.json({ error: "Invite code already used" }, { status: 400 });
  }

  // Update the invite code as used
  try {
    const result = await tursoClient.execute(
      "UPDATE invites SET used_at = CURRENT_TIMESTAMP, used_by = ? WHERE inviter_signature = ?",
      [recipient, inviterSignature]
    );

    if (result.rowsAffected !== 1) {
      console.error("Failed to update invite code", result);
      return NextResponse.json({ error: "Failed to update invite code" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating invite code:", error);
    return NextResponse.json({ error: "Failed to update invite code" }, { status: 500 });
  }
}
