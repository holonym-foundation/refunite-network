import { http, createConfig } from "wagmi";

import { defaultChain, supportedChains } from "./chain-config";
import { getAlchemyRpcUrl } from "./rpc";
import silk from "./silk-connector";

export const wagmiConfig = createConfig({
  chains: supportedChains,
  connectors: [silk()],
  transports: Object.fromEntries(
    supportedChains.map((chain) => [chain.id, http(getAlchemyRpcUrl(chain.id))])
  ),
  ssr: true,
});
