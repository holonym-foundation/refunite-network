"use client";

import { WagmiProvider } from "wagmi";

import { wagmiConfig } from "../wagmi/config";

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>;
}
