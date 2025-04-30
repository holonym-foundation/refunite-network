import { useAccount, useWalletClient } from "wagmi";

export const useSilkSigner = () => {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();

  const signMessage = async (message: string) => {
    if (!walletClient) {
      throw new Error("Wallet client not available");
    }

    try {
      const signature = await walletClient.signMessage({
        message,
      });
      return signature;
    } catch (error) {
      console.error("Error signing message:", error);
      throw error;
    }
  };

  return {
    signMessage,
    isConnected: !!address,
  };
};
