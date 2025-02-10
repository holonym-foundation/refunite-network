"use client";
import { MultiCallResult } from "@hatsprotocol/sdk-v1-core";
import { HatsClient } from "@hatsprotocol/sdk-v1-core";
import Safe from "@safe-global/protocol-kit";
import { Eip1193Provider } from "@safe-global/protocol-kit/dist/src/types/safeProvider";
import { OperationType, TransactionResult } from "@safe-global/types-kit";
import { getAddress, Hex } from "viem";
import { useAccount, useWalletClient } from "wagmi";

import { useHatsClient } from "./useHatsClient";

import {
  NETWORK_STEWARD_HAT_ID,
  NETWORK_STEWARD_SAFE_ADDRESS,
  HATS_CONTRACT_ADDRESS,
} from "../lib/constants";

type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };

type CallData = {
  functionName: string;
  callData: Hex;
};

interface CreateHatData {
  createHatCalldata: CallData;
  mintHatCalldata: CallData;
  nextHatId: bigint;
}

export interface SafeTxData {
  to: string;
  value: string;
  data: string;
}

interface HatsInteractions {
  createAndMintHat: (recipient: string, name: string) => Promise<Result<MultiCallResult, Error>>;
  createAndMintHatSafe: (
    recipient: string,
    name: string
  ) => Promise<Result<TransactionResult, Error>>;
}

export const useHatsInteractions = () => {
  const { hatsClient, isLoading: isClientLoading } = useHatsClient();
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();

  if (!hatsClient) {
    return {
      hatsInteractions: null,
      isConnected: false,
    };
  }

  const interactions: HatsInteractions = {
    createAndMintHat: async (recipient: string, name: string) => {
      if (!address) {
        return {
          success: false,
          error: new Error("No wallet connected"),
        };
      }

      const data = await buildHatData(hatsClient, recipient, name);
      if (!data) {
        throw new Error("Failed to construct hat transaction data");
      }

      try {
        const result = await hatsClient.multicall({
          account: address,
          calls: [data.createHatCalldata, data.mintHatCalldata],
        });

        return {
          success: true,
          data: result,
        };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err : new Error("Failed to create and mint hat"),
        };
      }
    },
    createAndMintHatSafe: async (recipient: string, name: string) => {
      console.log("creating and minting hat safe", walletClient);
      try {
        const safe = await Safe.init({
          provider: walletClient as Eip1193Provider,
          safeAddress: NETWORK_STEWARD_SAFE_ADDRESS,
        });

        const data = await buildHatData(hatsClient, recipient, name);
        if (!data) {
          return {
            success: false,
            error: new Error("Failed to construct hat transaction data"),
          };
        }

        const addOwnerTx = await safe.createAddOwnerTx({ ownerAddress: recipient });

        // Extract transaction data
        const addOwnerTxData = {
          to: addOwnerTx.data.to,
          value: addOwnerTx.data.value,
          data: addOwnerTx.data.data,
          operation: OperationType.Call,
        };

        const tx = await safe.createTransaction({
          transactions: [...mapToSafeTx(HATS_CONTRACT_ADDRESS, data), addOwnerTxData],
        });
        // const txHash = await safe.getTransactionHash(tx)
        // const signature = await safe.signHash(txHash)
        const txWithSignature = await safe.executeTransaction(tx);
        return {
          success: true,
          data: txWithSignature,
        };
      } catch (err) {
        console.error("the real error", err);
        return {
          success: false,
          error: err instanceof Error ? err : new Error("Failed to create and mint hat"),
        };
      }
    },
  };

  return {
    hatsInteractions: interactions,
    isConnected: !!address && !isClientLoading,
  };
};

function mapToSafeTx(address: string, data: CreateHatData): SafeTxData[] {
  return [
    { to: address, value: "0", data: data.createHatCalldata.callData },
    { to: address, value: "0", data: data.mintHatCalldata.callData },
  ];
}

async function buildHatData(
  hatsClient: HatsClient,
  recipient: string,
  name: string
): Promise<CreateHatData | undefined> {
  if (!recipient || !name) {
    return undefined;
  }

  try {
    const createHatCalldata = hatsClient.createHatCallData({
      admin: BigInt(NETWORK_STEWARD_HAT_ID),
      details: name,
      maxSupply: 1,
      eligibility: NETWORK_STEWARD_SAFE_ADDRESS,
      toggle: NETWORK_STEWARD_SAFE_ADDRESS,
      mutable: true,
    });

    const children = await hatsClient.getChildrenHats(BigInt(NETWORK_STEWARD_HAT_ID));
    const nextHatId = (
      await hatsClient.predictNextChildrenHatIDs({
        admin: BigInt(NETWORK_STEWARD_HAT_ID),
        numChildren: children.length,
      })
    )[0];

    const mintHatCalldata = hatsClient.mintHatCallData({
      hatId: nextHatId,
      wearer: getAddress(recipient),
    });

    return {
      createHatCalldata,
      mintHatCalldata,
      nextHatId,
    };
  } catch (err) {
    return undefined;
  }
}
