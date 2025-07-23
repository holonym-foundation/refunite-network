"use client";
import { Suspense } from "react";

import Link from "next/link";
import { useAccount } from "wagmi";

import { ConnectButton } from "@/components/ConnectButton";
import { ProfileSection } from "@/components/ProfileSection";
import { ShareSection } from "@/components/ShareSection";
import { StatusSection } from "@/components/StatusSection";
import { Container } from "@/components/ui/Container";
import { InfoText } from "@/components/ui/InfoText";

import en from "@/content/en";
import { useIsWearerOfHat } from "@/hooks/useIsWearerOfHat";

function AccountPage() {
  const { address, isConnected, chainId } = useAccount();
  const { hasHat, isLoading: isHatLoading, error: isHatError } = useIsWearerOfHat();

  // Not connected state
  if (!isConnected) {
    return (
      <Container>
        <div className="flex flex-col items-center justify-center">
          <InfoText
            heading={en.page.myAccountTitle}
            message={en.page.loginPrompt}
            variant="info"
            className="mb-6"
          />
          <ConnectButton />
        </div>
      </Container>
    );
  }

  // Loading hat status
  if (isHatLoading) {
    return (
      <Container>
        <InfoText
          heading="Loading account status"
          message="Checking your network membership..."
          variant="progress"
        />
      </Container>
    );
  }

  // Error loading hat status
  if (isHatError) {
    return (
      <Container>
        <InfoText
          heading="Error loading account"
          message="Failed to load your network membership status. Please try refreshing the page."
          variant="warning"
        />
      </Container>
    );
  }

  // Main account view
  return (
    <Container>
      {/* Profile Section */}
      <ProfileSection address={address} />

      {/* Status Section */}
      <StatusSection hasHat={hasHat} isHatLoading={isHatLoading} isHatError={isHatError} />

      {/* Actions Section */}
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
    </Container>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div>{en.common.loading}</div>}>
      <AccountPage />
    </Suspense>
  );
}
