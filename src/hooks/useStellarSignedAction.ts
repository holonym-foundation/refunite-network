import type { SignedAction } from "@/hooks/useSignedAction";
import { signWithFreighter } from "@/lib/client/freighter";
import { generateNonce } from "@/lib/eip712";
import {
  STELLAR_ACTIONS,
  StellarActionMessage,
  StellarActionType,
  buildStellarActionMessage,
} from "@/lib/stellar/signed-actions";

const NETWORK_PASSPHRASE = process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE ?? "";

/** Fields the caller provides: everything except the signer's account, nonce and time. */
export type StellarActionFields<T extends StellarActionType> = Omit<
  StellarActionMessage<T>,
  (typeof STELLAR_ACTIONS)[T]["signer"] | "nonce" | "issuedAt"
>;

/**
 * Signs Stellar actions (src/lib/stellar/signed-actions.ts) with Freighter as `account`.
 * The server rebuilds the same text and verifies it with verifyStellarAction.
 */
export function useStellarSignedAction(account: string | null) {
  async function sign<T extends StellarActionType>(
    primaryType: T,
    fields: StellarActionFields<T>
  ): Promise<SignedAction> {
    if (!account) throw new Error("Connect your Stellar wallet first");
    if (!NETWORK_PASSPHRASE) throw new Error("Stellar network is not configured");

    const issuedAt = Math.floor(Date.now() / 1000);
    const message = {
      ...fields,
      [STELLAR_ACTIONS[primaryType].signer]: account,
      nonce: generateNonce(),
      issuedAt: BigInt(issuedAt),
    } as unknown as StellarActionMessage<T>;

    const text = buildStellarActionMessage(primaryType, message, NETWORK_PASSPHRASE);
    const signature = await signWithFreighter(text, account, NETWORK_PASSPHRASE);

    const jsonMessage = Object.fromEntries(
      Object.entries(message).map(([key, value]) => [key, String(value)])
    );
    return { message: jsonMessage, signature, issuedAt };
  }

  return { sign };
}
