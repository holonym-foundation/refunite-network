"use client";
import { useState } from "react";

import { Scanner, type IDetectedBarcode } from "@yudiel/react-qr-scanner";
import { QrCode } from "lucide-react";
import { isAddress } from "viem";
import { useAccount } from "wagmi";

import { Button } from "@/packages/ui/src/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/packages/ui/src/components/ui/dialog";
import { Input } from "@/packages/ui/src/components/ui/input";
import { Label } from "@/packages/ui/src/components/ui/label";
import { useToast } from "@/packages/ui/src/components/ui/use-toast";
import { useHatsInteractions } from "@/packages/web3/src/hooks/useHatsInteractions";
import { useSafeOwner } from "@/packages/web3/src/hooks/useSafeOwner";

export default function AssignHatPage() {
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
          ? `Successfully proposed hat creation and minting for ${name} (${recipient})`
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
              <h1 className="text-2xl font-semibold mb-4">Assign Hat</h1>
              <p className="text-base">Please connect your wallet to assign a hat.</p>
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
          <header className="py-2">
            <h1 className="text-lg font-semibold">Assign Hat to Community Leader</h1>
          </header>

          {account && (
            <section className="py-4 border-b border-slate-300">
              <p className="text-sm">
                {isSafeLoading ? (
                  <span className="text-muted-foreground font-medium">Checking permissions...</span>
                ) : isMultisigOwner ? (
                  <span className="text-green-600 font-medium">
                    You can create and assign new hats as a Safe owner
                  </span>
                ) : (
                  <span className="text-red-600 font-medium">
                    You don&apos;t have permission to create new hats
                  </span>
                )}
              </p>
            </section>
          )}

          <form onSubmit={handleSubmit} className="py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Wallet Address</Label>
                <div className="flex gap-2">
                  <Input
                    id="address"
                    type="text"
                    placeholder="0x..."
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
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
                <Label htmlFor="name">Leader Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={isLoading} className="mt-4">
                {isLoading ? "Assigning..." : "Assign Hat"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
