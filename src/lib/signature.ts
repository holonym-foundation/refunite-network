import { ethers } from "ethers";
import { z } from "zod";
import { createNetworkInviteTypedData } from "./eip712";
import { TypedDataDefinition } from "viem";

export const inviteSignatureMessageSchema = z.object({
  message: z.string(),
  nonce: z.string(),
  timestamp: z.number(),
});

export type InviteSignatureMessage = z.infer<typeof inviteSignatureMessageSchema>;

export function getInviteSignatureMessage(
  inviterAddress: string,
  nonce: string
): TypedDataDefinition {
  return createNetworkInviteTypedData({
    inviterAddress,
    nonce,
    chainId: 11155111,
  });
}

export function verifyInviteSignature({
  message,
  signature,
  maxAgeSeconds = 60 * 60 * 24, // 24 hours default
}: {
  message: string;
  signature: string;
  maxAgeSeconds?: number;
}): boolean {
  try {
    const parsed = inviteSignatureMessageSchema.parse(JSON.parse(message));
    // Optionally check the message string
    if (parsed.message !== "I authorize this invite to be created for the RelayId Network.") {
      return false;
    }
    // Optionally check timestamp is recent
    const now = Math.floor(Date.now() / 1000);
    if (now - parsed.timestamp > maxAgeSeconds) {
      return false;
    }

    // Recipient is the signer
    const recovered = ethers.verifyMessage(message, signature);

    //TODO: check is the signer is an onboarded leader
    return true;
  } catch {
    return false;
  }
}
