"use client";

import { mintLeaderHat } from "@/app/actions/defender";
import { useAccount } from "wagmi";

type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };

interface HatsInteractions {
  onboardUser: (
    recipient: string
  ) => Promise<Result<{ mintHatTxHash: string; claimSignerTxHash: string }, Error>>;
  inviteUser: (
    recipient: string,
    signature: string,
    typedData: any
  ) => Promise<Result<{ mintHatTxHash: string; claimSignerTxHash: string }, Error>>;
}

export const useHatsInteractions = () => {
  const { address } = useAccount();

  if (!address) {
    return {
      hatsInteractions: null,
      isConnected: false,
    };
  }

  const interactions: HatsInteractions = {
    onboardUser: async (recipient: string) => {
      try {
        // This function appears incomplete in the original implementation
        // The mintLeaderHat action requires signature and typedData
        return {
          success: false,
          error: new Error("onboardUser method is not implemented correctly"),
        };
      } catch (err) {
        console.error("Error in mintHatSafe:", err);
        return {
          success: false,
          error: err instanceof Error ? err : new Error("Failed to mint hat"),
        };
      }
    },
    inviteUser: async (recipient: string, signature: string, typedData: any) => {
      try {
        const result = await mintLeaderHat(recipient, signature as `0x${string}`, typedData, true);

        if (result.error) {
          throw new Error(result.error);
        }

        return {
          success: true,
          data: {
            mintHatTxHash: result.mintHatTxHash || "",
            claimSignerTxHash: result.claimSignerTxHash || "",
          },
        };
      } catch (err) {
        console.error("Error in inviteUser:", err);
        return {
          success: false,
          error: err instanceof Error ? err : new Error("Failed to onboard user with invite"),
        };
      }
    },
  };

  return {
    hatsInteractions: interactions,
    isConnected: !!address,
  };
};
