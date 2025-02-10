import { useEffect, useState } from "react";

import { HatsClient } from "@hatsprotocol/sdk-v1-core";
import { getChainId } from "@wagmi/core";
import { usePublicClient, useWalletClient } from "wagmi";

import { wagmiConfig } from "../wagmi/config";

export const useHatsClient = () => {
  const [hatsClient, setHatsClient] = useState<HatsClient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const publicClient = usePublicClient();
  const { data: walletClient, isLoading: isWalletClientLoading } = useWalletClient();

  useEffect(() => {
    const initHatsClient = async () => {
      if (!publicClient || isWalletClientLoading) {
        return;
      }
      try {
        setIsLoading(true);
        const chainId = getChainId(wagmiConfig);
        const client = new HatsClient({
          chainId,
          publicClient,
          walletClient,
        });
        setHatsClient(client);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to initialize Hats client"));
        setHatsClient(null);
      } finally {
        setIsLoading(false);
      }
    };

    initHatsClient();
  }, [walletClient]);

  return {
    hatsClient,
    isLoading,
    error,
  };
};
