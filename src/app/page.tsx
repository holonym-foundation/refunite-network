"use client";
import { useEffect, useState } from "react";

import { Copy, QrCode } from "lucide-react";
import Link from "next/link";
import QRCode from "react-qr-code";
import { useAccount, useReadContract } from "wagmi";

import { ConnectButton } from "@/components/ConnectButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

import { HATS_CONTRACT_ADDRESS, LEADER_ADMIN_HAT_ID } from "@/lib/constants";
import { abi as HatsAbi } from "@/lib/hatsAbi";

const WhatsAppIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 50 50"
    className="h-5 w-5"
    fill="currentColor"
  >
    <path d="M25,2C12.318,2,2,12.318,2,25c0,3.96,1.023,7.854,2.963,11.29L2.037,46.73c-0.096,0.343-0.003,0.711,0.245,0.966 C2.473,47.893,2.733,48,3,48c0.08,0,0.161-0.01,0.24-0.029l10.896-2.699C17.463,47.058,21.21,48,25,48c12.682,0,23-10.318,23-23 S37.682,2,25,2z M36.57,33.116c-0.492,1.362-2.852,2.605-3.986,2.772c-1.018,0.149-2.306,0.213-3.72-0.231 c-0.857-0.27-1.957-0.628-3.366-1.229c-5.923-2.526-9.791-8.415-10.087-8.804C15.116,25.235,13,22.463,13,19.594 s1.525-4.28,2.067-4.864c0.542-0.584,1.181-0.73,1.575-0.73s0.787,0.005,1.132,0.021c0.363,0.018,0.85-0.137,1.329,1.001 c0.492,1.168,1.673,4.037,1.819,4.33c0.148,0.292,0.246,0.633,0.05,1.022c-0.196,0.389-0.294,0.632-0.59,0.973 s-0.62,0.76-0.886,1.022c-0.296,0.291-0.603,0.606-0.259,1.19c0.344,0.584,1.529,2.493,3.285,4.039 c2.255,1.986,4.158,2.602,4.748,2.894c0.59,0.292,0.935,0.243,1.279-0.146c0.344-0.39,1.476-1.703,1.869-2.286 s0.787-0.487,1.329-0.292c0.542,0.194,3.445,1.604,4.035,1.896c0.59,0.292,0.984,0.438,1.132,0.681 C37.062,30.587,37.062,31.755,36.57,33.116z"></path>
  </svg>
);

export default function AccountPage() {
  const { address, isConnected, chainId } = useAccount();
  const [hasHat, setHasHat] = useState<boolean | null>(null);
  const [showCopied, setShowCopied] = useState(false);
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);

  const hatsContractAddress = HATS_CONTRACT_ADDRESS;
  const hatsId = BigInt(LEADER_ADMIN_HAT_ID);
  const {
    data: rawHatData,
    isError: isHatError,
    isLoading: isHatLoading,
  } = useReadContract({
    address: hatsContractAddress,
    abi: HatsAbi,
    functionName: "viewHat",
    args: [hatsId],
  });

  useEffect(() => {
    if (rawHatData) {
      setHasHat(rawHatData[8]); // active flag of hat
    }
  }, [rawHatData]);

  if (!isConnected) {
    return (
      <div className="min-h-screen py-0 sm:py-8 px-0 sm:px-6 md:px-8">
        <div className="max-w-3xl mx-0 sm:mx-auto">
          <div className="bg-white p-4 pb-16 sm:p-8 sm:rounded-xl sm:border sm:border-slate-300">
            <div className="text-center">
              <h1 className="text-2xl font-semibold mb-4">My Account</h1>
              <p className="text-base">Please log in to view your account details.</p>
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
          <div>
            {/* Profile Section */}
            <div className="py-4 border-b border-slate-300">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">My Account</h2>
                  <p className="text-sm font-mono font-semibold text-secondary">
                    {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Unknown"}
                  </p>
                </div>
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (address) {
                        navigator.clipboard.writeText(address);
                        setShowCopied(true);
                        setTimeout(() => setShowCopied(false), 2000);
                      }
                    }}
                  >
                    <Copy className="h-5 w-5" />
                  </Button>
                  {showCopied && (
                    <div className="absolute right-full mr-2 top-1/2 transform -translate-y-1/2 bg-slate-800 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
                      Address copied to clipboard
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Share Section */}
            <div className="py-4 border-b border-slate-300">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Share address via</h3>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (address) {
                        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
                          `My RelayId address: ${address}`
                        )}`;
                        window.open(whatsappUrl, "_blank");
                      }
                    }}
                  >
                    <WhatsAppIcon />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setIsQrDialogOpen(true)}>
                    <QrCode className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* QR Dialog */}
            <Dialog open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Share QR Code</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center space-y-4 p-4">
                  <div className="p-4 bg-white border border-slate-200 rounded-xl">
                    {address && chainId ? (
                      <QRCode
                        value={`${chainId}:${address}`}
                        size={200}
                        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                        viewBox={`0 0 256 256`}
                      />
                    ) : (
                      <div className="w-[200px] h-[200px] bg-slate-100 rounded-lg flex items-center justify-center">
                        <p className="text-sm text-slate-400">Log in to view QR code</p>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    Scan this QR code to share your account address
                  </p>
                </div>
              </DialogContent>
            </Dialog>

            {/* Status Section */}
            <div className="py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Status</h3>
                {isHatLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : isHatError ? (
                  <Badge
                    variant="destructive"
                    className="bg-red-200 text-red-700 gap-1 px-3 py-2 shadow-sm font-semibold tracking-wide"
                  >
                    Error loading status
                  </Badge>
                ) : hasHat ? (
                  <Badge
                    variant="default"
                    className="bg-green-200 text-green-700 gap-1 px-3 py-2 shadow-sm font-semibold tracking-wide"
                  >
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
                    Added to network
                  </Badge>
                ) : (
                  <Badge
                    variant="destructive"
                    className="bg-red-200 text-red-700 gap-1 px-3 py-2 shadow-sm font-semibold tracking-wide"
                  >
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
                    Not added to network
                  </Badge>
                )}
              </div>
            </div>

            {/* Actions Section */}
            {!isHatLoading && (
              <div className="mt-8">
                <div className="flex gap-4">
                  {hasHat ? (
                    <Link
                      href="/add"
                      className="font-semibold text-blue-600 hover:text-blue-800 border-b-2 border-blue-600 flex items-center gap-1"
                    >
                      Add another leader
                      <svg
                        className="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M5 12H19M19 12L12 5M19 12L12 19"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </Link>
                  ) : (
                    <span className="text-slate-500">
                      You don&apos;t have permission to add another leader.
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
