"use client";

import { Suspense, useState } from "react";

import { useAccount } from "wagmi";

import { ConnectButton } from "@/components/ConnectButton";
import { PermissionBadge } from "@/components/PermissionBadge";
import { InfoText } from "@/components/ui/InfoText";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/button";

import { AddLeaderViaInviteLinkSection } from "@/components/AddLeaderViaInviteLinkSection";
import { AddLeaderViaQRSection } from "@/components/AddLeaderViaQRSection";
import en from "@/content/en";
import { useSafeOwner } from "@/hooks/useSafeOwner";

function AddLeaderForm() {
  const { address: account, isConnected } = useAccount();
  const { isMultisigOwner, isLoading: isSafeLoading } = useSafeOwner();
  const [showCelebration, setShowCelebration] = useState(false);

  // Not connected state
  if (!isConnected) {
    return (
      <Container>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
          <InfoText
            heading={en.addPage.headings.addLeaderToNetwork}
            message={en.addPage.prompts.loginToAdd}
            variant="info"
            className="text-center"
          />
          <ConnectButton />
        </div>
      </Container>
    );
  }

  // Loading safe owner status
  if (isSafeLoading) {
    return (
      <Container>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <InfoText
            heading="Checking permissions"
            message="Verifying your ability to add leaders..."
            variant="progress"
            className="text-center"
          />
        </div>
      </Container>
    );
  }

  // Not allowed state
  if (!isMultisigOwner) {
    return (
      <Container>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <InfoText
            heading={en.common.notAllowed}
            message={en.addPage.prompts.notAllowed + "\n" + en.addPage.prompts.getBadge}
            variant="warning"
            className="text-center"
          />
        </div>
      </Container>
    );
  }

  // Main add leader view
  return (
    <Container>
      {/* Header with permission badge */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-semibold">{en.addPage.headings.addLeaderToNetwork}</h1>
        <PermissionBadge isAllowed={isMultisigOwner} loading={isSafeLoading} />
      </div>

      {/* Add leader sections */}
      <div className="space-y-8">
        <AddLeaderViaQRSection onSuccess={() => setShowCelebration(true)} />
        <AddLeaderViaInviteLinkSection disabled={!isMultisigOwner} />
      </div>

      {/* Celebration modal */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/90 animate-fade-in">
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
    </Container>
  );
}

export default function AddLeaderPage() {
  return (
    <Suspense fallback={<div>{en.common.loading}</div>}>
      <AddLeaderForm />
    </Suspense>
  );
}
