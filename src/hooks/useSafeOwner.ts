import { useEffect, useState } from "react";

import SafeApiKit from "@safe-global/api-kit";
import { useAccount } from "wagmi";

import { CHAIN_ID, LEADER_SAFE_ADDRESS } from "../lib/constants";

export const useSafeOwner = () => {
  const { address: account } = useAccount();
  const [isMultisigOwner, setIsMultisigOwner] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const checkSafeOwnership = async (chainId: string, safeAddress: string) => {
      if (!account) {
        setIsMultisigOwner(false);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const safeService = new SafeApiKit({
          chainId: BigInt(chainId),
        });

        // Get Safe info
        const safeInfo = await safeService.getSafeInfo(safeAddress);
        const owners = safeInfo.owners;

        setIsMultisigOwner(
          owners.map((owner) => owner.toLowerCase()).includes(account.toLowerCase())
        );
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to check Safe ownership"));
        setIsMultisigOwner(false);
      } finally {
        setIsLoading(false);
      }
    };

    if (CHAIN_ID && LEADER_SAFE_ADDRESS) {
      checkSafeOwnership(CHAIN_ID, LEADER_SAFE_ADDRESS);
    }
  }, [account]);

  return {
    isMultisigOwner,
    isLoading,
    error,
  };
};
