import { NextResponse } from "next/server";
import { Address, getAddress, Hash } from "viem";

import { verifyNetworkInviteSignature } from "@/lib/eip712";
import { supabase } from "@/lib/supabase/client";
import { randomBytes } from "crypto";

function generateInviteCode(): string {
  const bytes = randomBytes(6);
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
    const { inviterAddress, signature, nonce, typedData } = body;

    if (!inviterAddress || !signature || !nonce || !typedData) {
      return NextResponse.json(
        { error: "inviterAddress, signature, nonce, and typedData are required" },
        { status: 400 }
      );
    }

    // Verify the EIP-712 signature
    const isValidSignature = await verifyNetworkInviteSignature({
      typedData,
      signature: signature as Hash,
      address: getAddress(inviterAddress),
    });

    if (!isValidSignature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Verify the typedData contents match the request
    if (typedData.message.inviterAddress !== inviterAddress || typedData.message.nonce !== nonce) {
      return NextResponse.json({ error: "TypedData mismatch with request data" }, { status: 400 });
    }

    // Extract data from the verified typed data
    const { createdAt } = typedData.message;

    // Check if signature creation time is not too old (24 hours)
    const signatureTimestamp = Number(createdAt);
    const currentTimestamp = Math.floor(Date.now() / 1000);
    if (currentTimestamp - signatureTimestamp > 86400) {
      return NextResponse.json({ error: "Signature has expired" }, { status: 401 });
    }

    // Generate unique invite code
    const inviteCode = generateInviteCode();

    // Store invite in database
    const { error } = await supabase.from("invites").insert({
      invite_code: inviteCode,
      inviter_signature: signature,
      typed_data: typedData,
    });

    if (error) {
      console.error("Error storing invite:", error);
      return NextResponse.json({ error: "Failed to store invite" }, { status: 500 });
    }

    return NextResponse.json({
      inviteCode,
    });
  } catch (error) {
    console.error("Error creating invite:", error);
    return NextResponse.json({ error: "Failed to create invite" }, { status: 500 });
  }
}
