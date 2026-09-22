import { generateNonce } from "@/lib/eip712";
import {
  SIGNER_ROLE,
  SignedActionMessage,
  SignedActionType,
  createSignedActionTypedData,
} from "@/lib/eip712/signed-actions";
import { defaultChain } from "@/wagmi/chain-config";
import { useAccount } from "wagmi";
import { useSilkSigner } from "./useSilkSigner";

/** A signed action, ready to send as a JSON request body. */
export type SignedAction = {
  message: Record<string, string>;
  signature: `0x${string}`;
  issuedAt: number; // unix seconds
};

/** Fields the caller provides: everything except the signer's own address, nonce and time. */
export type SignedActionFields<T extends SignedActionType> = Omit<
  SignedActionMessage<T>,
  (typeof SIGNER_ROLE)[T] | "nonce" | "issuedAt"
>;

/**
 * Signs actions from src/lib/eip712/signed-actions.ts with the connected wallet, filling in
 * the signer (the connected address, as the action's leader or beneficiary), nonce and time.
 * The server verifies them with verifySignedAction against the default chain.
 */
export function useSignedAction() {
  const { address } = useAccount();
  const { signTypedData } = useSilkSigner();

  async function sign<T extends SignedActionType>(
    primaryType: T,
    fields: SignedActionFields<T>
  ): Promise<SignedAction> {
    if (!address) throw new Error("Wallet not connected");

    const issuedAt = Math.floor(Date.now() / 1000);
    const message = {
      ...fields,
      [SIGNER_ROLE[primaryType]]: address,
      nonce: generateNonce(),
      issuedAt: BigInt(issuedAt),
    } as unknown as SignedActionMessage<T>;

    const signature = await signTypedData(
      createSignedActionTypedData(primaryType, message, defaultChain.id)
    );

    // JSON cannot carry bigint
    const jsonMessage = Object.fromEntries(
      Object.entries(message).map(([key, value]) => [key, String(value)])
    );
    return { message: jsonMessage, signature, issuedAt };
  }

  return { sign, address };
}
