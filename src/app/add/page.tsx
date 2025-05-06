"use client";

import { Suspense, useState } from "react";

import { useAccount } from "wagmi";

import { ConnectButton } from "@/components/ConnectButton";
import { PermissionBadge } from "@/components/PermissionBadge";

import { AddLeaderViaInviteLinkSection } from "@/components/AddLeaderViaInviteLinkSection";
import { AddLeaderViaQRSection } from "@/components/AddLeaderViaQRSection";
import { Button } from "@/components/ui/button";
import en from "@/content/en";
import { useSafeOwner } from "@/hooks/useSafeOwner";

function AddLeaderForm() {
  const { address: account, isConnected } = useAccount();
  const { isMultisigOwner, isLoading: isSafeLoading } = useSafeOwner();
  const [showCelebration, setShowCelebration] = useState(false);

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
          {isSafeLoading && !showCelebration && (
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
                <PermissionBadge isAllowed={isMultisigOwner} loading={isSafeLoading} />
              </div>
            )}
          </header>

          {!isSafeLoading && isMultisigOwner && (
            <>
              <AddLeaderViaQRSection onSuccess={() => {}} />
              <AddLeaderViaInviteLinkSection disabled={!isMultisigOwner} />
            </>
          )}

          {!isSafeLoading && !isMultisigOwner && (
            <div className="text-center p-4 space-y-2">
              <p className="text-base">You are not allowed to add leaders to the network.</p>
              <p className="text-base">Get your leadership badge from another leader</p>
            </div>
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
