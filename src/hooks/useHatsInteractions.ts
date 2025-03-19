"use client";

import Safe from "@safe-global/protocol-kit";
import { Eip1193Provider } from "@safe-global/protocol-kit/dist/src/types/safeProvider";
import { TransactionResult } from "@safe-global/types-kit";
import { getAddress, encodeFunctionData } from "viem";
import { useAccount, useWalletClient } from "wagmi";

import {
  LEADER_HAT_ID,
  LEADER_SAFE_ADDRESS,
  HATS_CONTRACT_ADDRESS,
  HSG_CONTRACT_ADDRESS,
} from "../lib/constants";

import { useHatsClient } from "./useHatsClient";

type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };

// TODO: This is temporary. Silk needs to fix their gas estimation, remove once that's done
const CLAIM_GAS_LIMIT = 250_000;

export interface SafeTxData {
  to: string;
  value: string;
  data: string;
}

interface HatsInteractions {
  mintHatSafe: (recipient: string) => Promise<Result<TransactionResult, Error>>;
  claimSignerFor: (recipient: string) => Promise<Result<TransactionResult, Error>>;
}

export const useHatsInteractions = () => {
  const { hatsClient, isLoading: isClientLoading } = useHatsClient();
  const { address } = useAccount();
  const walletClient = useWalletClient();

  if (!hatsClient) {
    return {
      hatsInteractions: null,
      isConnected: false,
    };
  }

  const interactions: HatsInteractions = {
    mintHatSafe: async (recipient: string) => {
      try {
        const safe = await Safe.init({
          provider: walletClient.data as Eip1193Provider,
          safeAddress: LEADER_SAFE_ADDRESS,
        });

        const { callData: mintData } = hatsClient.mintHatCallData({
          hatId: BigInt(LEADER_HAT_ID),
          wearer: getAddress(recipient),
        });
        if (!mintData) {
          return {
            success: false,
            error: new Error("Failed to construct hat transaction data"),
          };
        }

        const transactions = [
          {
            to: HATS_CONTRACT_ADDRESS,
            value: "0",
            data: mintData,
          },
        ];

        const tx = await safe.createTransaction({ transactions });
        const txWithSignature = await safe.executeTransaction(tx);

        return {
          success: true,
          data: txWithSignature,
        };
      } catch (err) {
        console.error("Error in mintHatSafe:", err);
        return {
          success: false,
          error: err instanceof Error ? err : new Error("Failed to mint hat"),
        };
      }
    },

    claimSignerFor: async (recipient: string) => {
      try {
        if (!walletClient?.data) {
          return {
            success: false,
            error: new Error("Wallet not connected"),
          };
        }

        const data = buildClaimData(recipient);
        const hash = await walletClient.data.sendTransaction({
          to: HSG_CONTRACT_ADDRESS,
          data,
          value: BigInt(0),
          account: address!,
          chain: undefined, // use currently connected chain
          gas: BigInt(CLAIM_GAS_LIMIT),
        });

        return {
          success: true,
          data: {
            hash,
            transactionResponse: { hash },
          },
        };
      } catch (err) {
        console.error("Failed to claim signer:", err);
        return {
          success: false,
          error: err instanceof Error ? err : new Error("Failed to claim signer"),
        };
      }
    },
  };

  return {
    hatsInteractions: interactions,
    isConnected: !!address && !isClientLoading,
  };
};

function buildClaimData(recipient: string) {
  const functionAbi = {
    name: "claimSignerFor",
    type: "function",
    inputs: [
      { name: "_hatId", type: "uint256" },
      { name: "_signer", type: "address" },
    ],
    stateMutability: "nonpayable",
  } as const;

  const encodedData = encodeFunctionData({
    abi: [functionAbi],
    functionName: "claimSignerFor",
    args: [BigInt(LEADER_HAT_ID), getAddress(recipient)],
  });

  return encodedData;
}
