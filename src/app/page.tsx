"use client";
import { useEffect, useState } from "react";

import { Copy } from "lucide-react";
import Link from "next/link";
import { useAccount, useReadContract } from "wagmi";

import { ConnectButton } from "@/components/ConnectButton";
import { ProfileSection } from "@/components/ProfileSection";
import { ShareSection } from "@/components/ShareSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { HATS_CONTRACT_ADDRESS, LEADER_ADMIN_HAT_ID } from "@/lib/constants";
import { abi as HatsAbi } from "@/lib/hatsAbi";

export default function AccountPage() {
  const { address, isConnected, chainId } = useAccount();
  const [hasHat, setHasHat] = useState<boolean | null>(null);

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
            <ProfileSection address={address} />

            {/* Share Section */}
            <ShareSection address={address} chainId={chainId} />

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
