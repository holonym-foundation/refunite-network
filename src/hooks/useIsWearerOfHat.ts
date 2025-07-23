import { readContract } from "@wagmi/core";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";

import { HATS_CONTRACT_ADDRESS, LEADER_HAT_ID } from "@/lib/constants";
import { abi as HatsAbi } from "@/lib/hatsAbi";
import { wagmiConfig } from "@/wagmi/config";

export function useIsWearerOfHat() {
  const { address, isConnected, chainId } = useAccount();
  const [hasHat, setHasHat] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);

  const hatsContractAddress = HATS_CONTRACT_ADDRESS;
  const hatsId = BigInt(LEADER_HAT_ID || "0");

  useEffect(() => {
    const checkHat = async () => {
      if (address && isConnected) {
        setIsLoading(true);
        setError(false);
        try {
          const rawHatData = await readContract(wagmiConfig, {
            address: hatsContractAddress,
            abi: HatsAbi,
            functionName: "isWearerOfHat",
            args: [address, hatsId],
            chainId: chainId,
          });
          setHasHat(rawHatData);
        } catch (error) {
          console.error("Error checking hat status:", error);
          setError(true);
        } finally {
          setIsLoading(false);
        }
      } else {
        setHasHat(null);
        setIsLoading(false);
        setError(false);
      }
    };

    checkHat();
  }, [address, isConnected, hatsId, hatsContractAddress, chainId]);

  return {
    hasHat,
    isLoading,
    error,
    isConnected,
  };
}
