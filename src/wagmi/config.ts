import { http, createConfig } from "wagmi";

import { supportedChains } from "./chain-config";
import silk from "./silk-connector";

if (!process.env.NEXT_PUBLIC_ALCHEMY_API_KEY) {
  throw new Error("Missing NEXT_PUBLIC_ALCHEMY_API_KEY");
}

const getAlchemyRpcUrl = (chainId: number) => {
  const network = chainId === 11155111 ? "eth-sepolia" : "celo-mainnet";
  return `https://${network}.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`;
};

export const wagmiConfig = createConfig({
  chains: supportedChains,
  connectors: [silk()],
  transports: {
    [supportedChains[0].id]: http(getAlchemyRpcUrl(supportedChains[0].id)),
    [supportedChains[1].id]: http(getAlchemyRpcUrl(supportedChains[1].id)),
  },
  ssr: true,
});
