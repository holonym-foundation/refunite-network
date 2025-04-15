"use client";
import { UserRejectedRequestError } from "viem";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { sepolia } from "wagmi/chains";

import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { useToast } from "./ui/use-toast";

import silk from "@/wagmi/silk-connector";

export function ConnectButton() {
  const { connect, error, isError, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const account = useAccount();
  const { toast } = useToast();

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const copyAddress = async (address: string) => {
    await navigator.clipboard.writeText(address);
    toast({
      description: "Address copied to clipboard",
      duration: 2000,
    });
  };

  const handleConnect = async () => {
    const silkConnector = connectors.find((connector) => connector.id === "silk");
    try {
      if (!silkConnector) {
        console.error("Silk connector not found in wagmi config");
        connect({
          chainId: sepolia.id,
          connector: silk({ useStaging: false, project: { name: "RelayId" } }),
        });
        return;
      }

      connect({ chainId: sepolia.id, connector: silkConnector });
    } catch (error) {
      console.error("Error connecting to Silk:", error);
      if (error instanceof UserRejectedRequestError) console.log("User aborted the transaction");
    }
  };

  return (
    <div className="flex items-center gap-2">
      {!account.address ? (
        <div className="flex items-center gap-2">
          <Button onClick={handleConnect}>Login</Button>
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-row lg:flex-row-reverse">
          <Button onClick={() => disconnect()}>Logout</Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className="font-mono text-muted-foreground text-sm sm:text-xs"
                  onClick={() => copyAddress(account.address!)}
                >
                  {formatAddress(account.address)}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Click to copy address</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
      {isError && error.message && <div className="text-red-500">{error.message}</div>}
    </div>
  );
}
