import { http, createConfig } from "wagmi";
import { sepolia } from "wagmi/chains";

import silk from "./silk-connector";

export const wagmiConfig = createConfig({
  chains: [sepolia],
  // chains: [sepolia, mainnet],
  connectors: [
    silk({ config: { appName: process.env.NEXT_PUBLIC_APP_NAME! || "App", darkMode: false } }),
  ],
  transports: {
    // [mainnet.id]: http(),
    [sepolia.id]: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL),
  },
  ssr: true,
});
