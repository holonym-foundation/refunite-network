import { ethers } from "ethers";
import { z } from "zod";
import { createNetworkInviteTypedData, verifyNetworkInviteSignature } from "./eip712";
import { TypedDataDefinition } from "viem";
import { INVITE_TTL_SECONDS } from "./constants";

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
