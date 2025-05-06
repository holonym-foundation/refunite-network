"use client";

import { useAccount } from "wagmi";

type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };

interface HatsInteractions {
  onboardUser: (
    recipient: string
  ) => Promise<Result<{ mintHatTxHash: string; claimSignerTxHash: string }, Error>>;
  inviteUser: (
    recipient: string,
    signature: string,
    message: string
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
        const response = await fetch("/api/defender", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ recipient }),
        });

        if (!response.ok) {
          throw new Error(`API responded with status ${response.status}`);
        }

        const data = await response.json();
        return {
          success: true,
          data: {
            mintHatTxHash: data.mintHatTxHash,
            claimSignerTxHash: data.claimSignerTxHash,
          },
        };
      } catch (err) {
        console.error("Error in mintHatSafe:", err);
        return {
          success: false,
          error: err instanceof Error ? err : new Error("Failed to mint hat"),
        };
      }
    },
    inviteUser: async (recipient: string, signature: string, message: string) => {
      try {
        const response = await fetch("/api/defender", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            recipient,
            signature,
            message,
          }),
        });

        if (!response.ok) {
          throw new Error(`API responded with status ${response.status}`);
        }

        const data = await response.json();
        return {
          success: true,
          data: {
            mintHatTxHash: data.mintHatTxHash,
            claimSignerTxHash: data.claimSignerTxHash,
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
