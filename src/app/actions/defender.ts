"use server";

import { Address, Hash, TypedDataDefinition } from "viem";

import { verifyNetworkInviteSignature } from "@/lib/eip712";
import { INVITE_TTL_SECONDS } from "@/lib/constants";
import { serializeBigInts } from "@/lib/utils/serialize";

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
    // Require all fields for all onboarding flows
    if (!recipient || !signature || !typedData) {
      return { error: "recipient, signature, and typedData are required" };
    }

    const defenderWebhookUrl = process.env.DEFENDER_WEBHOOK_URL;
    if (!defenderWebhookUrl) {
      return { error: "Defender webhook URL not configured" };
    }

    // Verify the EIP-712 signature
    const isValidSignature = await verifyNetworkInviteSignature({
      typedData,
      signature,
      address: typedData.message.inviterAddress as Address,
    });

    if (!isValidSignature) {
      return { error: "Invalid signature" };
    }

    // Extract data from the verified typed data
    const { createdAt } = typedData.message;

    const signatureTimestamp = Number(createdAt);
    const currentTimestamp = Math.floor(Date.now() / 1000);

    if (currentTimestamp - signatureTimestamp > INVITE_TTL_SECONDS) {
      return { error: "Signature has expired" };
    }

    const payload = {
      recipient,
      typedData: serializeBigInts(typedData),
      signature,
    };

    const response = await fetch(defenderWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseBody = await response.text();

    if (!response.ok) {
      throw new Error(`Defender webhook error: ${response.status}`);
    }

    const data = JSON.parse(responseBody);
    const result = JSON.parse(data.result);

    if (result.error) {
      throw new Error(result.error);
    }

    return {
      mintHatTxHash: result.mintHatTxHash,
      claimSignerTxHash: result.claimSignerTxHash,
    };
  } catch (error) {
    console.error("Error in defender action:", error);
    return { error: "Failed to process request" };
  }
}
