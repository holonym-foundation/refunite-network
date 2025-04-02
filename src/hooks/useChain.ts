"use client";

import { Hash } from "viem";
import { usePublicClient } from "wagmi";

export const useChain = () => {
  const publicClient = usePublicClient();

  /**
   * Wait for a transaction to be confirmed on the chain, plus a number of confirmations.
   * NOTE: It DOES NOT check if the transaction is still in the canonical chain,
   * so it might return a receipt for a block that is later reorged out of the canonical chain.
   *
   * @param hash - The hash of the transaction to wait for.
   * @param confirmations - The number of confirmations to wait for.
   * @param onProgress - A callback function that is called with the number of confirmations.
   * @returns The transaction receipt.
   */
  const waitForConfirmations = async (
    hash: Hash,
    confirmations: number = 8,
    onProgress?: (confirms: number) => void
  ) => {
    if (!publicClient) throw new Error("Public client not available");

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    let currentBlock = await publicClient.getBlockNumber();
    onProgress?.(Math.max(0, Math.min(Number(currentBlock - receipt.blockNumber), confirmations)));

    while (currentBlock - receipt.blockNumber < confirmations) {
      await new Promise<void>((resolve) => {
        const unwatch = publicClient.watchBlockNumber({
          onBlockNumber: (blockNumber) => {
            currentBlock = blockNumber;
            const confirms = Number(blockNumber - receipt.blockNumber);
            onProgress?.(Math.max(0, Math.min(confirms, confirmations)));
            unwatch();
            resolve();
          },
        });
      });
    }

    onProgress?.(confirmations);
    return receipt;
  };

  return {
    waitForConfirmations,
  };
};
