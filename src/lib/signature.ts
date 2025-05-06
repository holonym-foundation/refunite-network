import { ethers } from "ethers";

export function getInviteSignatureMessage(nonce: string): string {
  return `I authorize this invite to be created for the RelayId Network. Nonce: ${nonce}`;
}

export function verifyInviteSignature({
  message,
  signature,
  expectedAddress,
}: {
  message: string;
  signature: string;
  expectedAddress: string;
}): boolean {
  try {
    const recovered = ethers.verifyMessage(message, signature);
    return recovered.toLowerCase() === expectedAddress.toLowerCase();
  } catch {
    return false;
  }
}
