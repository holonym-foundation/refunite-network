import { http, createConfig } from "wagmi";
import { sepolia } from "wagmi/chains";

import silk from "./silk-connector";

export const wagmiConfig = createConfig({
  chains: [sepolia],
  connectors: [silk({ useStaging: false })],
  transports: {
    [sepolia.id]: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL),
  },
  ssr: true,
});
