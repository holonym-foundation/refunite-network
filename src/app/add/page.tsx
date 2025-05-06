"use client";

import { Suspense, useEffect, useState } from "react";

import { Scanner, type IDetectedBarcode } from "@yudiel/react-qr-scanner";
import { QrCode } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { isAddress } from "viem";
import { useAccount, useChainId } from "wagmi";

import { ConnectButton } from "@/components/ConnectButton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

import en from "@/content/en";
import { useSafeOwner } from "@/hooks/useSafeOwner";
import { useSilkSigner } from "@/hooks/useSilkSigner";
import { createNetworkInviteTypedData, generateNonce } from "@/lib/eip712";

function AddLeaderForm() {
  const { address: account, isConnected } = useAccount();
  const [recipient, setRecipient] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { isMultisigOwner, isLoading: isSafeLoading } = useSafeOwner();
  const { signMessage, signTypedData, isConnected: isSilkConnected } = useSilkSigner();
  const [showScanner, setShowScanner] = useState(false);
  const chainId = useChainId();
  const searchParams = useSearchParams();
  const [inviteLink, setInviteLink] = useState<string>("");
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [scannedViaQR, setScannedViaQR] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    const theirAddress = searchParams.get("recipient");
    if (theirAddress && isAddress(theirAddress)) {
      setRecipient(theirAddress);
    }
  }, [searchParams]);

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
    setScannedViaQR(true);
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

  const handleGenerateInvite = async () => {
    if (!account || !isSilkConnected || !chainId) return;

    setIsGeneratingInvite(true);
    try {
      // Generate a nonce
      const nonce = generateNonce();

      // Create EIP-712 typed data
      const typedData = createNetworkInviteTypedData({
        inviterAddress: account,
        nonce,
        chainId,
      });

      // Request signature from Silk wallet
      const signature = await signTypedData(typedData);

      const response = await fetch("/api/invites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inviterAddress: account,
          signature,
          nonce,
          typedData,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate invite");
      }

      const { inviteCode } = await response.json();
      const link = `${window.location.origin}/invite/${inviteCode}`;
      setInviteLink(link);
    } catch (error) {
      console.error("Error generating invite:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate invite link",
      });
    } finally {
      setIsGeneratingInvite(false);
    }
  };

  const handleCopyLink = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    toast({
      title: en.common.copiedExclamation,
      description: en.common.inviteCopied,
    });
  };

  const handleShareWhatsApp = () => {
    if (!inviteLink) return;
    const message = `${en.common.joinMe}${inviteLink}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  const handleAddLeaderViaSignature = async () => {
    setIsLoading(true);
    try {
      if (!account || !isSilkConnected || !chainId) throw new Error("Not connected to Silk wallet");

      // Generate a nonce
      const nonce = generateNonce();

      // Create EIP-712 typed data
      const typedData = createNetworkInviteTypedData({
        inviterAddress: account,
        nonce,
        chainId,
      });

      // Request signature from Silk wallet
      const signature = await signTypedData(typedData);

      // Call /api/defender
      const response = await fetch("/api/defender", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient,
          signature,
          inviterAddress: account,
          nonce,
          typedData,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to add leader via Defender");
      }

      setRecipient("");
      setScannedViaQR(false);
      setShowCelebration(true);

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

  if (!isConnected) {
    return (
      <div className="min-h-screen py-0 sm:py-8 px-0 sm:px-6 md:px-8">
        <div className="max-w-3xl mx-0 sm:mx-auto">
          <div className="bg-white p-4 pb-16 sm:p-8 sm:rounded-xl sm:border sm:border-slate-300">
            <div className="text-center">
              <h1 className="text-2xl font-semibold mb-4">
                {en.addPage.headings.addLeaderToNetwork}
              </h1>
              <p className="text-base">{en.addPage.prompts.loginToAdd}</p>
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
        <div className="bg-white p-4 pb-16 sm:p-8 sm:rounded-xl sm:border sm:border-slate-300 relative">
          {showCelebration && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/90 animate-fade-in">
              <div className="flex flex-col items-center">
                <svg
                  className="w-20 h-20 text-green-500 animate-pop"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="12" cy="12" r="10" fill="#22c55e" opacity="0.15" />
                  <path
                    d="M20 6L9 17L4 12"
                    stroke="#22c55e"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <h2 className="mt-6 text-2xl font-bold text-green-700 animate-fade-in">
                  Leader added!
                </h2>
                <p className="mt-2 text-green-600 animate-fade-in">
                  You successfully added a new leader to the network.
                </p>
                <Button onClick={() => setShowCelebration(false)} className="mt-4">
                  Close
                </Button>
              </div>
            </div>
          )}
          {isLoading && !showCelebration && (
            <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-white/80">
              <div className="flex flex-col items-center">
                <div className="h-16 w-16 animate-spin rounded-full border-4 border-green-500 border-t-transparent mb-6" />
                <span className="text-lg font-semibold text-green-700">Adding leader...</span>
                <span className="text-sm text-muted-foreground mt-2">
                  This may take a moment. Please keep this page open.
                </span>
              </div>
            </div>
          )}
          <header className="py-2 flex justify-between items-center">
            <h1 className="text-lg font-semibold">{en.addPage.headings.addLeaderToNetworkShort}</h1>
            {account && (
              <div>
                {isSafeLoading ? (
                  <span className="text-sm text-muted-foreground font-medium">
                    {en.common.checkingPermissions}
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
                        {en.common.allowed}
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
                        {en.common.notAllowed}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </header>

          {/* TODO: explain what to do when not allowed */}

          {!isSafeLoading && isMultisigOwner && (
            <>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddLeaderViaSignature();
                }}
                className="py-4"
              >
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
                  <Button
                    type="submit"
                    disabled={isLoading || !isMultisigOwner || !recipient}
                    className="mt-8"
                  >
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
                      Sending <span className="font-bold">two</span> transactions. Please keep this
                      page open...
                    </span>
                  )}
                </div>
              </form>

              <div className="mt-8 pt-8 border-t border-slate-200">
                <h2 className="text-lg font-semibold mb-4">Send invite link</h2>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Button
                      onClick={handleGenerateInvite}
                      disabled={isGeneratingInvite || !isMultisigOwner || !!inviteLink}
                      className="shrink-0"
                    >
                      {isGeneratingInvite ? (
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          Generating...
                        </div>
                      ) : (
                        "Generate invite link"
                      )}
                    </Button>
                    {inviteLink && (
                      <>
                        <Button onClick={handleCopyLink} variant="outline" className="shrink-0">
                          Copy link
                        </Button>
                        <Button
                          onClick={handleShareWhatsApp}
                          variant="outline"
                          className="shrink-0"
                        >
                          Share on WhatsApp
                        </Button>
                      </>
                    )}
                  </div>
                  {inviteLink && (
                    <div className="text-sm text-slate-500">
                      <p>Invite link expires in 24 hours</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AddLeaderPage() {
  return (
    <Suspense fallback={<div>{en.common.loading}</div>}>
      <AddLeaderForm />
    </Suspense>
  );
}
