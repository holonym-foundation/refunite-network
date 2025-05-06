import { NextResponse } from "next/server";
import { Address, Hash } from "viem";

import { LEADER_HAT_ID } from "@/lib/constants";
import { verifyNetworkInviteSignature } from "@/lib/eip712";
import { supabase } from "@/lib/supabase/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { recipient, signature, isInviteLink, typedData } = body;

    // Require all fields for all onboarding flows
    if (!recipient || !signature || !typedData) {
      return NextResponse.json(
        { error: "recipient, signature, and typedData are required" },
        { status: 400 }
      );
    }

    const defenderWebhookUrl = process.env.DEFENDER_WEBHOOK_URL;
    if (!defenderWebhookUrl) {
      return NextResponse.json({ error: "Defender webhook URL not configured" }, { status: 500 });
    }

    // Verify the EIP-712 signature
    const isValidSignature = await verifyNetworkInviteSignature({
      typedData,
      signature: signature as Hash,
      address: typedData.message.inviterAddress as Address,
    });

    if (!isValidSignature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Extract data from the verified typed data
    const { inviterAddress, nonce, createdAt } = typedData.message;

    // Check if signature creation time is not too old (24 hours)
    const signatureTimestamp = Number(createdAt);
    const currentTimestamp = Math.floor(Date.now() / 1000);
    if (currentTimestamp - signatureTimestamp > 86400) {
      return NextResponse.json({ error: "Signature has expired" }, { status: 401 });
    }

    const payload = {
      recipient,
      signature,
      hatId: LEADER_HAT_ID,
    };

    const response = await fetch(defenderWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseBody = await response.text();
    const data = JSON.parse(responseBody);
    const result = JSON.parse(data.result);

    if (!response.ok || result.error) {
      throw new Error(result.error || `Defender webhook responded with status ${response.status}`);
    }

    // Only mark the invite as used after successful Defender response
    if (nonce && isInviteLink) {
      const { error: markError } = await supabase
        .from("invites")
        .update({
          used_at: new Date().toISOString(),
          used_by: recipient,
        })
        .eq("signature_nonce", nonce);

      if (markError) {
        console.error("Failed to mark invite as used:", markError);
        // We don't throw here since the Defender action was successful
      }
    }

    return NextResponse.json({
      mintHatTxHash: result.mintHatTxHash,
      claimSignerTxHash: result.claimSignerTxHash,
    });
  } catch (error) {
    console.error("Error in defender webhook:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
