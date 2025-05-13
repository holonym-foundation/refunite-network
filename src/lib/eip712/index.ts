import { Address, Hash, TypedDataDefinition, verifyTypedData } from "viem";
import { generateSiweNonce } from "viem/siwe";

/**
 * Domain definition for the RelayID Network
 * This provides separation between different applications using EIP-712
 */
export const EIP712_DOMAIN = {
  name: "RelayID Network",
  version: "1",
  verifyingContract: "0x0000000000000000000000000000000000000000",
  // Add chainId dynamically when creating typed data
};

/**
 * Type definition for network invites
 * The same structure is used for both creating invites and adding leaders
 * since they are the same in the current implementation
 */
export const NETWORK_INVITE_TYPE = {
  NetworkInvite: [
    { name: "content", type: "string" },
    { name: "inviterAddress", type: "address" },
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

  return {
    domain: {
      ...EIP712_DOMAIN,
      chainId,
    },
    primaryType: "NetworkInvite",
    types: NETWORK_INVITE_TYPE,
    message: {
      content,
      inviterAddress,
      nonce,
      createdAt: BigInt(Math.floor(Date.now() / 1000)),
    },
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
