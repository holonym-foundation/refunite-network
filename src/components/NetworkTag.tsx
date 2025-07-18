"use client";

import { useChainId } from "wagmi";
import { defaultChain } from "../wagmi/chain-config";

export function NetworkTag() {
  const chainId = useChainId();

  // Only show in development and preview builds, not in production
  if (process.env.VERCEL_ENV === "production") {
    return null;
  }

  // Use defaultChain if chainId is undefined (no wallet connected)
  const currentChainId = chainId || defaultChain.id;

  // Show network name based on chain ID
  const getNetworkName = () => {
    switch (currentChainId) {
      case 11155111:
        return "sepolia";
      case 42220:
        return "celo";
      default:
        return `unknown (${currentChainId})`;
    }
  };

  const networkName = getNetworkName().toUpperCase();

  return (
    <div className="flex justify-start">
      <span className="inline-flex items-center px-2 text-xs font-semibold border border-purple-800 rounded-full tracking-wide text-purple-800">
        {networkName}
      </span>
    </div>
  );
}
