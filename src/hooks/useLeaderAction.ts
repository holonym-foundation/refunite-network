import { generateNonce } from "@/lib/eip712";
import {
  LeaderActionMessage,
  LeaderActionType,
  createLeaderActionTypedData,
} from "@/lib/eip712/leader-actions";
import { defaultChain } from "@/wagmi/chain-config";
import { useAccount } from "wagmi";
import { useSilkSigner } from "./useSilkSigner";

/** A signed leader action, ready to send as a JSON request body. */
export type SignedLeaderAction = {
  message: Record<string, string>;
  signature: `0x${string}`;
  issuedAt: number; // unix seconds
};

/**
 * Signs leader actions (see src/lib/eip712/leader-actions.ts) with the connected wallet.
 * The server verifies them with verifyLeaderAction against the default chain.
 */
export function useLeaderAction() {
  const { address } = useAccount();
  const { signTypedData } = useSilkSigner();

  async function sign<T extends LeaderActionType>(
    primaryType: T,
    fields: Omit<LeaderActionMessage<T>, "leader" | "nonce" | "issuedAt">
  ): Promise<SignedLeaderAction> {
    if (!address) throw new Error("Wallet not connected");

    const issuedAt = Math.floor(Date.now() / 1000);
    const message = {
      ...fields,
      leader: address,
      nonce: generateNonce(),
      issuedAt: BigInt(issuedAt),
    } as LeaderActionMessage<T>;

    const signature = await signTypedData(
      createLeaderActionTypedData(primaryType, message, defaultChain.id)
    );

    // JSON cannot carry bigint
    const jsonMessage = Object.fromEntries(
      Object.entries(message).map(([key, value]) => [key, String(value)])
    );
    return { message: jsonMessage, signature, issuedAt };
  }

  return { sign, address };
}
