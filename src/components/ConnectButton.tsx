"use client";
import { UserRejectedRequestError } from "viem";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useEffect, useState } from "react";

// Add type declaration for window.silk
declare global {
  interface Window {
    silk?: {
      disconnect: () => void;
    };
  }
}

import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { useToast } from "./ui/use-toast";

import en from "@/content/en";
import { defaultChain } from "@/wagmi/chain-config";
import silk from "@/wagmi/silk-connector";

export function ConnectButton() {
  const { connect, error, isError, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { address, isConnecting } = useAccount();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const copyAddress = async (address: string) => {
    await navigator.clipboard.writeText(address);
    toast({
      description: en.common.addressCopied,
      duration: 2000,
    });
  };

  const handleConnect = async () => {
    const silkConnector = connectors.find((connector) => connector.id === "silk");
    try {
      if (!silkConnector) {
        console.error("Silk connector not found in wagmi config");
        connect({
          chainId: defaultChain.id,
          connector: silk(),
        });
        return;
      }

      connect({ chainId: defaultChain.id, connector: silkConnector });
    } catch (error) {
      console.error("Error connecting to Silk:", error);
      if (error instanceof UserRejectedRequestError) console.log("User aborted the transaction");
    }
  };

  const handleDisconnect = async () => {
    disconnect();

    //@ts-ignore
    window.silk.logout().then(() => {
      console.log("Logged out from Silk");
    });
    toast({
      description: en.common.accountDisconnected,
      duration: 2000,
    });
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div className="flex items-center gap-2">
        <Button disabled variant="outline">
          <div className="h-4 w-12 bg-muted animate-pulse rounded" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {!address ? (
        <div className="flex items-center gap-2">
          <Button onClick={handleConnect} disabled={isConnecting}>
            {isConnecting ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                {en.common.loggingIn}
              </div>
            ) : (
              en.common.login
            )}
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-row lg:flex-row-reverse">
          <Button onClick={handleDisconnect}>
            {en.common.logout}
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className="font-mono text-muted-foreground text-sm sm:text-xs"
                  onClick={() => copyAddress(address)}
                >
                  {formatAddress(address)}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{en.common.clickToCopyAddress}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
      {isError && error.message && <div className="text-red-500">{error.message}</div>}
    </div>
  );
}
