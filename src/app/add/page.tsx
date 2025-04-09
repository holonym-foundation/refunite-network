"use client";

import { Suspense, useState, useEffect } from "react";

import { Scanner, type IDetectedBarcode } from "@yudiel/react-qr-scanner";
import { QrCode } from "lucide-react";
import { isAddress } from "viem";
import { useSearchParams } from "next/navigation";
import { useAccount, usePublicClient } from "wagmi";

import { ConnectButton } from "@/components/ConnectButton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

import { useHatsInteractions } from "@/hooks/useHatsInteractions";
import { useSafeOwner } from "@/hooks/useSafeOwner";

function AddLeaderForm() {
  const { address: account, isConnected } = useAccount();
  const [recipient, setRecipient] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { isMultisigOwner, isLoading: isSafeLoading } = useSafeOwner();
  const { hatsInteractions, isConnected: isHatsConnected } = useHatsInteractions();
  const [showScanner, setShowScanner] = useState(false);
  const publicClient = usePublicClient();
  const searchParams = useSearchParams();

  useEffect(() => {
    const theirAddress = searchParams.get("recipient");
    if (theirAddress && isAddress(theirAddress)) {
      setRecipient(theirAddress);
    }
  }, [searchParams]);

  const handleAddLeader = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!isMultisigOwner || !isHatsConnected || !hatsInteractions || !publicClient) {
        throw new Error("Not properly connected");
      }

      const onboardResult = await hatsInteractions.onboardUser(recipient);
      if (!onboardResult.success) {
        throw onboardResult.error;
      }

      const { mintHatTxHash, claimSignerTxHash } = onboardResult.data;
      if (!mintHatTxHash || !claimSignerTxHash) {
        throw new Error("No transaction hashes");
      }

      await publicClient.waitForTransactionReceipt({
        hash: mintHatTxHash as `0x${string}`,
      });

      await publicClient.waitForTransactionReceipt({
        hash: claimSignerTxHash as `0x${string}`,
      });

      setRecipient("");
      toast({
        title: "Success",
        description: `Successfully added leader ${recipient}`,
      });
    } catch (error) {
      console.error("Error adding leader:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleScan = (results: IDetectedBarcode[]) => {
    const qrCode = results[0];
    if (!qrCode) return;

    // QR codes from our user page are in format "chainId:address"
    const { rawValue } = qrCode;
    const address = rawValue.split(":")[1];
    if (!isAddress(address)) {
      toast({
        variant: "destructive",
        title: "Error in QR code",
        description: `Invalid address: ${address}`,
      });
      return;
    }

    setRecipient(address);
    setShowScanner(false);
  };

  const handleScanError = (error: unknown) => {
    if (error instanceof Error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error while scanning",
        description: error.message,
      });
    } else {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error while scanning",
        description: "An unknown error occurred",
      });
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen py-0 sm:py-8 px-0 sm:px-6 md:px-8">
        <div className="max-w-3xl mx-0 sm:mx-auto">
          <div className="bg-white p-4 pb-16 sm:p-8 sm:rounded-xl sm:border sm:border-slate-300">
            <div className="text-center">
              <h1 className="text-2xl font-semibold mb-4">Add leader to the network</h1>
              <p className="text-base">Please log in to add a leader.</p>
              <div className="flex justify-center mt-8">
                <ConnectButton />
              </div>
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
          <header className="py-2 flex justify-between items-center">
            <h1 className="text-lg font-semibold">Add leader to network</h1>
            {account && (
              <div>
                {isSafeLoading ? (
                  <span className="text-sm text-muted-foreground font-medium">
                    Checking permissions...
                  </span>
                ) : (
                  <div
                    className={`px-3 py-1 rounded-full flex items-center gap-1 text-sm ${
                      isMultisigOwner ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}
                  >
                    {isMultisigOwner ? (
                      <>
                        <svg
                          className="w-4 h-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M20 6L9 17L4 12"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        Allowed
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-4 h-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M18 6L6 18M6 6L18 18"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        Not allowed
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </header>

          <form onSubmit={handleAddLeader} className="py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Their address</Label>
                <div className="flex gap-2">
                  <Input
                    id="address"
                    type="text"
                    placeholder="0x..."
                    value={recipient}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setRecipient(e.target.value)
                    }
                    required
                  />
                  <Dialog open={showScanner} onOpenChange={setShowScanner}>
                    <DialogTrigger asChild>
                      <Button type="button" variant="outline" size="icon" className="shrink-0">
                        <QrCode className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <div className="pt-4">
                        <Scanner onScan={handleScan} onError={handleScanError} />
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button type="submit" disabled={isLoading || !isMultisigOwner} className="mt-8">
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Adding leader...
                  </div>
                ) : (
                  "Add leader"
                )}
              </Button>
              {isLoading && (
                <span className="text-secondary text-sm mt-8">
                  Sending <span className="font-bold">two</span> transactions. Please keep this page
                  open...
                </span>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function AddLeaderPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AddLeaderForm />
    </Suspense>
  );
}
