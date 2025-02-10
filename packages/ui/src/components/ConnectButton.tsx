"use client";
import { UserRejectedRequestError } from "viem";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { sepolia } from "wagmi/chains";

import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { useToast } from "./ui/use-toast";

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
    if (!silkConnector) {
      console.error("Silk connector not found in wagmi config");
      return;
    }

    try {
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
          <Button onClick={handleConnect}>Connect</Button>
          <div className="lg:hidden animate-float-x">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-primary rotate-180"
            >
              <path
                d="M5 12H19M19 12L12 5M19 12L12 19"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-row lg:flex-row-reverse">
          <Button onClick={() => disconnect()}>Disconnect</Button>
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
