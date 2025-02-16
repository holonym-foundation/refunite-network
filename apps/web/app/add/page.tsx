"use client";
import { useState } from "react";

import { Button } from "@refunite/ui";
import { Dialog, DialogContent, DialogTrigger } from "@refunite/ui";
import { Input } from "@refunite/ui";
import { Label } from "@refunite/ui";
import { useToast } from "@refunite/ui";
import { useHatsInteractions } from "@refunite/web3";
import { useSafeOwner } from "@refunite/web3";
import { Scanner, type IDetectedBarcode } from "@yudiel/react-qr-scanner";
import { QrCode } from "lucide-react";
import { isAddress } from "viem";
import { useAccount } from "wagmi";

export default function AddLeaderPage() {
  const { address: account, isConnected } = useAccount();
  const [recipient, setRecipient] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { isMultisigOwner, isLoading: isSafeLoading } = useSafeOwner();
  const { hatsInteractions, isConnected: isHatsConnected } = useHatsInteractions();
  const [showScanner, setShowScanner] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!isMultisigOwner) {
        throw new Error("Not authorized to create hats");
      }

      if (!isHatsConnected || !hatsInteractions) {
        throw new Error("Hats client not connected");
      }
      console.log("sending request");
      const result = await hatsInteractions.createAndMintHatSafe(recipient, name);

      if (result.success) {
        setName("");
        setRecipient("");
      }

      toast({
        variant: result.success ? "default" : "destructive",
        title: result.success ? "Success" : "Error",
        description: result.success
          ? `Successfully added ${name} (${recipient})`
          : result.error.message,
      });
    } catch (error) {
      console.error("the error", error);
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

          <form onSubmit={handleSubmit} className="py-4">
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
              <div className="space-y-2">
                <Label htmlFor="name">Their name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={isLoading || !isMultisigOwner} className="mt-4">
                {isLoading ? "Adding..." : "Add leader"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
