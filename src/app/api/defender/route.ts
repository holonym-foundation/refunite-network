import { ethers } from "ethers";
import { NextResponse } from "next/server";

import { LEADER_HAT_ID } from "@/lib/constants";
import { supabase } from "@/lib/supabase/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { recipient, signature, inviterAddress, nonce } = body;

    if (!recipient) {
      return NextResponse.json({ error: "Recipient address is required" }, { status: 400 });
    }

    const defenderWebhookUrl = process.env.DEFENDER_WEBHOOK_URL;
    if (!defenderWebhookUrl) {
      return NextResponse.json({ error: "Defender webhook URL not configured" }, { status: 500 });
    }

    // If this is an invite-based onboarding, verify the signature
    if (signature && inviterAddress && nonce) {
      // Verify the signature
      const message = `I authorize this invite to be created for the RelayId Network. Nonce: ${nonce}`;
      const recoveredAddress = ethers.verifyMessage(message, signature);

      if (recoveredAddress.toLowerCase() !== inviterAddress.toLowerCase()) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const payload = {
      recipient,
      ...(signature && inviterAddress && nonce
        ? {
            signature,
            inviterAddress,
            hatId: LEADER_HAT_ID,
            nonce,
          }
        : {}),
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
    if (nonce) {
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
