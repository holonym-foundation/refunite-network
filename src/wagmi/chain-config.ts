import { Chain, celo, sepolia } from "wagmi/chains";

/**
 * Configure the default chain via environment variable:
 * - NEXT_PUBLIC_DEFAULT_CHAIN=celo (default)
 * - NEXT_PUBLIC_DEFAULT_CHAIN=sepolia or NEXT_PUBLIC_DEFAULT_CHAIN=11155111
 */
const getDefaultChain = (): Chain => {
  const envChain = process.env.NEXT_PUBLIC_DEFAULT_CHAIN?.toLowerCase();

  if (envChain === "sepolia" || envChain === "11155111") {
    console.log("Using Sepolia");
    return sepolia;
  }

  if (envChain === "celo" || envChain === "42220") {
    console.log("Using Celo");
    return celo;
  }

  // Default to Celo (previously was sepolia in dev/preview)
  console.log("Using Celo (default)");
  return celo;
};

export const defaultChain = getDefaultChain();

// Put the default chain first so wagmi uses it as fallback. Explicitly type as a
// non-empty tuple to satisfy TypeScript’s requirement for `supportedChains`.
const orderedChains: readonly [Chain, Chain] =
  defaultChain.id === sepolia.id ? [sepolia, celo] : [celo, sepolia];

export const supportedChains: readonly [Chain, ...Chain[]] = orderedChains;
