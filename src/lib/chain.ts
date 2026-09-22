import { defaultChain } from "@/wagmi/chain-config";
import { getAlchemyRpcUrl } from "@/wagmi/rpc";
import { PublicClient, createPublicClient, http } from "viem";

let publicClient: PublicClient | undefined;

/** Read-only client for the default chain (server side). */
export function getPublicClient(): PublicClient {
  publicClient ??= createPublicClient({
    chain: defaultChain,
    transport: http(getAlchemyRpcUrl(defaultChain.id)),
  }) as PublicClient;
  return publicClient;
}
