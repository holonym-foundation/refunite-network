import { ethers } from "ethers";
import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/client";

// Function to generate a random base62 string
function generateInviteCode(): string {
  const bytes = ethers.randomBytes(6);
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")
    .substring(0, 8);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { inviterAddress, signature, nonce } = body;

    if (!inviterAddress) {
      return NextResponse.json({ error: "Inviter address is required" }, { status: 400 });
    }

    if (!signature) {
      return NextResponse.json({ error: "Signature is required" }, { status: 400 });
    }

    if (!nonce) {
      return NextResponse.json({ error: "Nonce is required" }, { status: 400 });
    }

    // Verify the signature
    const message = `I authorize this invite to be created for the RelayId Network. Nonce: ${nonce}`;
    const recoveredAddress = ethers.verifyMessage(message, signature);

    if (recoveredAddress.toLowerCase() !== inviterAddress.toLowerCase()) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const inviteCode = generateInviteCode();

    // Set expiration to 24 hours from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Insert the invite into the database
    const { data: invite, error } = await supabaseAdmin
      .from("invites")
      .insert({
        inviter_address: inviterAddress,
        signature_nonce: nonce,
        inviter_signature: signature,
        invite_code: inviteCode,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating invite:", error);
      return NextResponse.json({ error: "Failed to create invite" }, { status: 500 });
    }

    return NextResponse.json({ inviteCode });
  } catch (error) {
    console.error("Error in invites endpoint:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
