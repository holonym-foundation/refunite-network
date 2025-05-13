"use client";
import { Suspense, useEffect, useState } from "react";

import { readContract } from "@wagmi/core";
import Link from "next/link";
import { useAccount } from "wagmi";

import { ConnectButton } from "@/components/ConnectButton";
import { ProfileSection } from "@/components/ProfileSection";
import { ShareSection } from "@/components/ShareSection";
import { StatusSection } from "@/components/StatusSection";

import en from "@/content/en";
import { HATS_CONTRACT_ADDRESS, LEADER_HAT_ID } from "@/lib/constants";
import { abi as HatsAbi } from "@/lib/hatsAbi";
import { wagmiConfig } from "@/wagmi/config";

function AccountPage() {
  const { address, isConnected, chainId } = useAccount();
  const [hasHat, setHasHat] = useState<boolean | null>(null);
  const [isHatLoading, setIsHatLoading] = useState<boolean>(false);
  const [isHatError, setIsHatError] = useState<boolean>(false);
  const hatsContractAddress = HATS_CONTRACT_ADDRESS;
  const hatsId = BigInt(LEADER_HAT_ID || "0");

  useEffect(() => {
    const checkHat = async () => {
      if (address) {
        setIsHatLoading(true);
        try {
          const rawHatData = await readContract(wagmiConfig, {
            address: hatsContractAddress,
            abi: HatsAbi,
            functionName: "isWearerOfHat",
            args: [address, hatsId],
          });
          setHasHat(rawHatData); // active flag of hat
        } catch (error) {
          setIsHatError(true);
        } finally {
          setIsHatLoading(false);
        }
      }
    };
    checkHat();
  }, [address, hatsId, hatsContractAddress]);

  if (!isConnected) {
    return (
      <div className="min-h-screen py-0 sm:py-8 px-0 sm:px-6 md:px-8">
        <div className="max-w-3xl mx-0 sm:mx-auto">
          <div className="bg-white p-4 pb-16 sm:p-8 sm:rounded-xl sm:border sm:border-slate-300">
            <div className="text-center">
              <h1 className="text-2xl font-semibold mb-4">{en.page.myAccountTitle}</h1>
              <p className="text-base">{en.page.loginPrompt}</p>
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

            {/* Status Section */}
            <StatusSection hasHat={hasHat} isHatLoading={isHatLoading} isHatError={isHatError} />

            {/* Actions Section */}
            {!isHatLoading && (
              <div className="mt-8">
                {hasHat === false && <ShareSection address={address} chainId={chainId} />}
                {hasHat === true && (
                  <Link
                    href="/add"
                    className="font-semibold text-blue-600 hover:text-blue-800 border-b-2 border-blue-600 flex items-center gap-1"
                  >
                    {en.page.addAnotherLeader}
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
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div>{en.common.loading}</div>}>
      <AccountPage />
    </Suspense>
  );
}
