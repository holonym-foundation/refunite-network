import { isConnected, requestAccess, signMessage } from "@stellar/freighter-api";

/** Asks Freighter (the Stellar browser wallet) for access and returns the account (G…). */
export async function connectFreighter(): Promise<string> {
  const connected = await isConnected();
  if (!connected.isConnected) {
    throw new Error("Freighter is not installed. Install it from freighter.app, then try again.");
  }
  const access = await requestAccess();
  if (access.error || !access.address) {
    throw new Error(access.error?.message ?? "Freighter did not share an account");
  }
  return access.address;
}

/** Signs `message` with Freighter (SEP-53) and returns the signature as base64. */
export async function signWithFreighter(
  message: string,
  account: string,
  networkPassphrase: string
): Promise<string> {
  const result = await signMessage(message, { address: account, networkPassphrase });
  if (result.error) throw new Error(result.error.message ?? "Signing was cancelled");
  if (!result.signedMessage) throw new Error("Freighter returned no signature");
  if (result.signerAddress && result.signerAddress !== account) {
    throw new Error("Freighter signed with a different account; switch accounts and try again");
  }

  // Newer Freighter versions return base64; older ones return the raw bytes
  if (typeof result.signedMessage === "string") return result.signedMessage;
  return btoa(String.fromCharCode(...Array.from(result.signedMessage as Uint8Array)));
}
