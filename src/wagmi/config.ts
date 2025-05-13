import { http, createConfig } from "wagmi";
import { celo, sepolia } from "wagmi/chains";

import silk from "./silk-connector";

export const wagmiConfig = createConfig({
  chains: [sepolia, celo],
  connectors: [silk({ useStaging: false, project: { name: "RelayID" } })],
  transports: {
    [sepolia.id]: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL),
    [celo.id]: http(process.env.NEXT_PUBLIC_CELO_RPC_URL),
  },
  ssr: true,
});
