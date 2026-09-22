import { Address, Hash, TypedDataDefinition, verifyTypedData } from "viem";
import { generateSiweNonce } from "viem/siwe";
import { z } from "zod";

export const domainSchema = z.object({
  name: z.string(),
  version: z.string(),
  verifyingContract: z.string(),
  chainId: z.number(),
});

export const networkInviteSchema = z.object({
  content: z.string(),
  inviterAddress: z.string(),
  nonce: z.string(),
  createdAt: z.bigint(),
});

export const directOnboardSchema = z.object({
  content: z.string(),
  inviterAddress: z.string(),
  recipient: z.string(),
  nonce: z.string(),
  createdAt: z.bigint(),
});

/**
 * Domain definition for the RelayID Network
 * This provides separation between different applications using EIP-712
 */
export const DOMAIN = {
  name: "RelayID",
  version: "1",
  verifyingContract: "0x0000000000000000000000000000000000000000",
  // Add chainId dynamically when creating typed data
};

/**
 * Type definition for network invites
 * The same structure is used for both creating invites and adding leaders
 * since they are the same in the current implementation
 */
const INVITE_TYPES = {
  NetworkInvite: [
    { name: "content", type: "string" },
    { name: "inviterAddress", type: "address" },
    { name: "nonce", type: "string" },
    { name: "createdAt", type: "uint256" },
  ],
};

const DIRECT_ONBOARD_TYPES = {
  DirectOnboard: [
    { name: "content", type: "string" },
    { name: "inviterAddress", type: "address" },
    { name: "recipient", type: "address" },
    { name: "nonce", type: "string" },
    { name: "createdAt", type: "uint256" },
  ],
};

/**
 * Creates a typed data structure for network invites
 * Used for both generating invites and adding leaders
 */
export function createNetworkInviteTypedData({
  inviterAddress,
  nonce,
  chainId,
}: {
  inviterAddress: Address;
  nonce: string;
  chainId: number;
}): TypedDataDefinition {
  const content = `I authorize this invite to be created for the RelayID Network.`;

  const domain = {
    ...DOMAIN,
    chainId,
  };

  const message = {
    content,
    inviterAddress,
    nonce,
    createdAt: BigInt(Math.floor(Date.now() / 1000)),
  };

  return {
    domain: domainSchema.parse(domain),
    primaryType: "NetworkInvite",
    types: INVITE_TYPES,
    message: networkInviteSchema.parse(message),
  };
}

/**
 * Generates a secure random nonce to use in EIP-712 signatures
 */
export function generateNonce(): string {
  return generateSiweNonce();
}

/**
 * Verifies an EIP-712 signature for a network invite
 */
export async function verifyNetworkInviteSignature({
  typedData,
  signature,
  address,
}: {
  typedData: TypedDataDefinition;
  signature: Hash;
  address: Address;
}): Promise<boolean> {
  return verifyTypedData({
    ...typedData,
    signature,
    address,
  });
}

/**
 * Creates a typed data structure for direct onboarding
 * Used when inviter directly onboards a specific recipient
 */
export function createDirectOnboardTypedData({
  inviterAddress,
  recipient,
  nonce,
  chainId,
}: {
  inviterAddress: Address;
  recipient: Address;
  nonce: string;
  chainId: number;
}): TypedDataDefinition {
  const domain = {
    ...DOMAIN,
    chainId,
  };

  const message = {
    content: "I'm adding another leader",
    inviterAddress,
    recipient,
    nonce,
    createdAt: BigInt(Math.floor(Date.now() / 1000)),
  };

  return {
    domain: domainSchema.parse(domain),
    primaryType: "DirectOnboard",
    types: DIRECT_ONBOARD_TYPES,
    message: directOnboardSchema.parse(message),
  };
}

/**
 * Verifies an EIP-712 signature for direct onboarding with enhanced security
 */
export async function verifyDirectOnboardSignature({
  typedData,
  signature,
  address,
  expectedRecipient,
}: {
  typedData: TypedDataDefinition;
  signature: Hash;
  address: Address;
  expectedRecipient: Address;
}): Promise<boolean> {
  // 1. Verify the signature itself
  const isValidSignature = await verifyTypedData({
    ...typedData,
    signature,
    address,
  });

  if (!isValidSignature) return false;

  // 2. Verify recipient in message (prevents signature reuse)
  if (typedData.message.recipient !== expectedRecipient) {
    return false;
  }

  // 3. Verify createdAt is recent (5-minute window)
  const currentTime = Math.floor(Date.now() / 1000);
  const signatureTime = Number(typedData.message.createdAt);

  if (Math.abs(currentTime - signatureTime) > 300) {
    return false;
  }

  return true;
}
