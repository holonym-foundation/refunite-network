import { http, createConfig } from "wagmi";

import { defaultChain, supportedChains } from "./chain-config";
import silk from "./silk-connector";

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
if (!ALCHEMY_API_KEY || ALCHEMY_API_KEY.length < 10) {
  console.error("Invalid or missing NEXT_PUBLIC_ALCHEMY_API_KEY");
}

const getAlchemyRpcUrl = (chainId: number) => {
  let network: string;

  switch (chainId) {
    case 11155111: // Sepolia
      network = "eth-sepolia";
      break;
    case 42220: // Celo
      network = "celo-mainnet";
      break;
    default:
      throw new Error(`Unsupported chain ID: ${chainId}`);
  }

  const url = `https://${network}.g.alchemy.com/v2/${ALCHEMY_API_KEY || "invalid-key"}`;
  return url;
};

export const wagmiConfig = createConfig({
  chains: supportedChains,
  connectors: [silk()],
  transports: Object.fromEntries(
    supportedChains.map((chain) => [chain.id, http(getAlchemyRpcUrl(chain.id))])
  ),
  ssr: true,
});
