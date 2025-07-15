"use server";

import { Hash, TypedDataDefinition } from "viem";
import { marshalTypedData } from "@/lib/utils/serialize";
import { generateWebhookSignature } from "@/lib/utils/webhook-security";
import { sendOnboardingFailedMessage, sendOnboardingSuccessMessage } from "@/lib/slack/webhook";

type AddLeaderViaSignedTypedDataResult = {
  mintHatTxHash?: string;
  claimSignerTxHash?: string;
  error?: string;
};

export async function addLeaderViaSignedTypedData(
  recipient: string,
  typedData: TypedDataDefinition,
  signature: Hash
): Promise<AddLeaderViaSignedTypedDataResult> {
  try {
    // Input validation
    if (!recipient || !signature || !typedData) {
      return { error: "recipient, signature, and typedData are required" };
    }

    const defenderWebhookUrl = process.env.DEFENDER_WEBHOOK_URL;

    if (!defenderWebhookUrl) {
      return { error: "Required environment variables not configured" };
    }

    // Validate typedData structure
    if (!typedData || typeof typedData !== "object") {
      return { error: "Invalid typedData: must be an object" };
    }

    if (!typedData.message) {
      console.error("typedData.message is undefined. Available keys:", Object.keys(typedData));
      return { error: "Invalid typedData structure: missing message field" };
    }

    // Determine flow type based on message structure
    const flowType = typedData.message.recipient ? "direct" : "invite";
    const inviterAddress = typedData.message.inviterAddress as string;

    console.log(`Processing ${flowType} onboarding for recipient: ${recipient}`);

    // Step 1: Verify reservation exists (created by client)
    let reservationId: string;
    const reservationPayload = {
      signature,
      typedData,
      recipient,
      inviterAddress,
    };

    if (flowType === "direct") {
      // Direct onboarding: create reservation first
      const directResult = await callDirectOnboardAPI(reservationPayload);

      if (!directResult.success) {
        return { error: directResult.error };
      }

      reservationId = directResult.reservationId!;
    } else if (flowType === "invite") {
      const validateResult = await callValidateAPI(reservationPayload);

      if (!validateResult.success) {
        return { error: validateResult.error };
      }

      reservationId = validateResult.reservationId!;
    } else {
      console.error("Invalid flow type", { flowType });
      return { error: `Invalid flow type: ${flowType}` };
    }

    console.log(`Created reservation: ${reservationId}`);

    // Step 2: Call Defender webhook with reservation context
    const payload = {
      recipient,
      typedData: marshalTypedData(typedData),
      signature,
      reservationId,
      flowType,
    };

    // Add HMAC authentication for webhook security
    const webhookSecret = process.env.DEFENDER_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return { error: "Webhook secret not configured" };
    }

    const payloadString = JSON.stringify(payload);
    const { signature: hmacSignature, timestamp } = generateWebhookSignature({
      webhookSecret,
      payload: payloadString,
    });

    console.log("Calling defender webhook with reservationId:", reservationId);
    const response = await fetch(defenderWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Timestamp": timestamp,
        "X-Webhook-Signature": `sha256=${hmacSignature}`,
      },
      body: payloadString,
    });

    const responseBody = await response.text();

    if (!response.ok) {
      // Rollback reservation on Defender failure
      await callRollbackAPI(reservationId, "blockchain_failure", apiToken, appUrl);
      throw new Error(`Defender webhook error: ${response.status}`);
    }

    const data = JSON.parse(responseBody);
    const result = JSON.parse(data.result);

    if (result.error) {
      // Rollback reservation on transaction failure
      await callRollbackAPI(reservationId, "blockchain_failure", apiToken, appUrl);
      throw new Error(result.error);
    }

    // Handle idempotent response (user already onboarded)
    if (result.mintHatTxHash === "already_onboarded") {
      console.log("User was already onboarded:", recipient);
      return {
        error: "This address is already onboarded as a leader",
      };
    }

    console.log(
      `Blockchain transactions completed: ${result.mintHatTxHash}, ${result.claimSignerTxHash}`
    );

    // Step 3: Confirm successful completion
    const confirmResult = await callConfirmAPI({
      reservationId,
      mintHatTxHash: result.mintHatTxHash,
      claimSignerTxHash: result.claimSignerTxHash,
      recipient,
      apiToken,
      appUrl,
    });

    if (!confirmResult.success) {
      console.error("Failed to confirm completion:", confirmResult.error);

      await sendOnboardingFailedMessage({
        inviterAddress,
        inviteFlow: flowType,
        inviteCode: reservationId,
        error: confirmResult.error || "Unknown error",
        payload: {
          reservationId,
          webhookError: result.error,
          mintHatTxHash: result.mintHatTxHash,
          claimSignerTxHash: result.claimSignerTxHash,
          recipient,
        },
      });
      // Note: Blockchain transactions succeeded, but database confirmation failed
      return {
        error: `Blockchain transactions completed successfully, but failed to update database: ${confirmResult.error}. Transaction hashes: ${result.mintHatTxHash}, ${result.claimSignerTxHash}`,
        mintHatTxHash: result.mintHatTxHash,
        claimSignerTxHash: result.claimSignerTxHash,
      };
    }

    await sendOnboardingSuccessMessage({
      inviterAddress,
      leaderAddress: recipient,
      inviteCode: reservationId,
      inviteFlow: flowType,
    });

    return {
      mintHatTxHash: result.mintHatTxHash,
      claimSignerTxHash: result.claimSignerTxHash,
    };
  } catch (error) {
    console.error("Error in defender action:", error);
    return { error: "Failed to process request" };
  }
}

// Helper functions for API calls
async function callDirectOnboardAPI(data: {
  signature: Hash;
  typedData: TypedDataDefinition;
  recipient: string;
  inviterAddress: string;
  apiToken: string;
  appUrl: string;
}): Promise<{ success: boolean; reservationId?: string; error?: string }> {
  try {
    const response = await fetch(`${data.appUrl}/api/invites/direct`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${data.apiToken}`,
      },
      body: JSON.stringify({
        signature: data.signature,
        typedData: marshalTypedData(data.typedData),
        recipient: data.recipient,
        inviterAddress: data.inviterAddress,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.error || "Direct onboard API failed" };
    }

    return { success: true, reservationId: result.reservationId };
  } catch (error) {
    console.error("Direct onboard API error:", error);
    return { success: false, error: "Failed to call direct onboard API" };
  }
}

async function callValidateAPI(data: {
  signature: Hash;
  typedData: TypedDataDefinition;
  recipient: string;
  inviterAddress: string;
  apiToken: string;
  appUrl: string;
}): Promise<{ success: boolean; reservationId?: string; error?: string }> {
  try {
    const response = await fetch(`${data.appUrl}/api/invites/reserve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${data.apiToken}`,
      },
      body: JSON.stringify({
        signature: data.signature,
        typedData: marshalTypedData(data.typedData),
        recipient: data.recipient,
        inviterAddress: data.inviterAddress,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.error || "Validate API failed" };
    }

    return { success: true, reservationId: result.reservationId };
  } catch (error) {
    console.error("Validate API error:", error);
    return { success: false, error: "Failed to call validate API" };
  }
}

async function callConfirmAPI(data: {
  reservationId: string;
  mintHatTxHash: string;
  claimSignerTxHash: string;
  recipient: string;
  apiToken: string;
  appUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${data.appUrl}/api/reservations/confirm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${data.apiToken}`,
      },
      body: JSON.stringify({
        reservationId: data.reservationId,
        mintHatTxHash: data.mintHatTxHash,
        claimSignerTxHash: data.claimSignerTxHash,
        recipient: data.recipient,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.error || "Confirm API failed" };
    }

    return { success: true };
  } catch (error) {
    console.error("Confirm API error:", error);
    return { success: false, error: "Failed to call confirm API" };
  }
}

async function callRollbackAPI(
  reservationId: string,
  reason: string,
  apiToken: string,
  appUrl: string
): Promise<void> {
  try {
    await fetch(`${appUrl}/api/reservations/rollback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify({ reservationId, reason }),
    });
  } catch (error) {
    console.error("Failed to rollback reservation:", error);
    // Log for manual intervention
  }
}
