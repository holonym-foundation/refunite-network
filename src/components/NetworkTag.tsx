"use client";

import { useChainId } from "wagmi";

export function NetworkTag() {
  const chainId = useChainId();

  // Only show in development and preview builds, not in production
  if (process.env.VERCEL_ENV === "production") {
    return null;
  }

  // Show network name based on chain ID
  const getNetworkName = () => {
    switch (chainId) {
      case 11155111:
        return "sepolia";
      case 42220:
        return "celo";
      default:
        return "unknown";
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
