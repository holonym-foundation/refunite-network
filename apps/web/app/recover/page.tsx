"use client";
import React, { useState } from "react";

import { AlertCircle, CheckCircle2 } from "lucide-react";
import { getAddress, Hex } from "viem";
import { useAccount, usePublicClient, useWaitForTransactionReceipt, useWalletClient } from "wagmi";

import { Alert, AlertDescription, AlertTitle } from "@/packages/ui/src/components/ui/alert";
import { Button } from "@/packages/ui/src/components/ui/button";
import { Input } from "@/packages/ui/src/components/ui/input";
import { Label } from "@/packages/ui/src/components/ui/label";
import { abi as HatsAbi } from "@/packages/web3/src/lib/hatsAbi";

export default function RecoverRolePage() {
  const publicClient = usePublicClient();
  const { data: walletClient, isLoading } = useWalletClient();
  const { isConnected } = useAccount();
  const [peerAddress, setPeerAddress] = useState("");

  const hatsContractAddress = "0x3bc1A0Ad72417f2d411118085256fC53CBdDd137"; // Sepolia testnet address
  const [txHash, setTxHash] = useState("");
  const { isSuccess, isError } = useWaitForTransactionReceipt({
    hash: txHash as Hex,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!publicClient) {
      console.log("PANIC");
      return;
    }

    const hatsId = BigInt("0x0000027000020000000000000000000000000000000000000000000000000000"); // https://app.hatsprotocol.xyz/trees/11155111/624?hatId=624.2

    const { request } = await publicClient.simulateContract({
      address: hatsContractAddress,
      abi: HatsAbi,
      functionName: "mintHat",
      args: [hatsId, getAddress(peerAddress)],
    });

    if (!request || !walletClient) {
      console.log("PANIC STUFF IS MISSING");
      return;
    }

    const txHash = await walletClient.writeContract(request);
    console.log("txHash", txHash);

    setTxHash(txHash);
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen py-0 sm:py-8 px-0 sm:px-6 md:px-8">
        <div className="max-w-3xl mx-0 sm:mx-auto">
          <div className="bg-white p-4 pb-16 sm:p-8 sm:rounded-xl sm:border sm:border-slate-300">
            <div className="text-center">
              <h1 className="text-2xl font-semibold mb-4">Recover Role</h1>
              <p className="text-base">Please connect your wallet to recover your role.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-0 sm:py-8 px-0 sm:px-6 md:px-8">
      <div className="max-w-3xl mx-0 sm:mx-auto">
        <div className="bg-white p-4 pb-16 sm:p-8 sm:rounded-xl sm:border sm:border-slate-300">
          <header>
            <h1 className="text-2xl font-semibold">Recover Role</h1>
          </header>

          <form onSubmit={handleSubmit} className="space-y-6 mt-6">
            <div className="space-y-2">
              <Label htmlFor="peerAddress">Peer Wallet Address</Label>
              <Input
                id="peerAddress"
                placeholder="0x..."
                value={peerAddress}
                onChange={(e) => setPeerAddress(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={isLoading || !isConnected}>
              {isLoading ? "Recovering..." : "Recover Role"}
            </Button>
          </form>

          {(isSuccess || isError) && (
            <Alert variant={isSuccess ? "default" : "destructive"}>
              {isSuccess ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertTitle>{isSuccess ? "Success" : "Error"}</AlertTitle>
              <AlertDescription>
                {isSuccess
                  ? "Your role has been successfully recovered."
                  : "An error occurred while recovering your role. Please try again."}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
}
