"use client";
import { useState, useEffect } from "react";

import { Badge, ConnectButton } from "@refunite/ui";
import { Button } from "@refunite/ui";
import { Skeleton } from "@refunite/ui";
import { NETWORK_STEWARD_HAT_ID, HATS_CONTRACT_ADDRESS } from "@refunite/web3";
import { abi as HatsAbi } from "@refunite/web3";
import { Copy, ChevronDown } from "lucide-react";
import Link from "next/link";
import QRCode from "react-qr-code";
import { useAccount, useReadContract } from "wagmi";

export default function AccountPage() {
  const { address, isConnected, chainId } = useAccount();
  const [hasHat, setHasHat] = useState<boolean | null>(null);
  const [showCopied, setShowCopied] = useState(false);
  const [isQrExpanded, setIsQrExpanded] = useState(false);

  const hatsContractAddress = HATS_CONTRACT_ADDRESS;
  const hatsId = BigInt(NETWORK_STEWARD_HAT_ID);
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

            {/* QR Code Section */}
            <div className="py-4 border-b border-slate-300">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setIsQrExpanded(!isQrExpanded)}
              >
                <h3 className="text-lg font-semibold">Show QR code</h3>
                <ChevronDown
                  className={`h-6 w-6 mr-2 transition-transform ${
                    isQrExpanded ? "transform rotate-180" : ""
                  }`}
                />
              </div>
              {isQrExpanded && (
                <div className="flex flex-col items-center space-y-4 mt-4">
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
              )}
            </div>

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
