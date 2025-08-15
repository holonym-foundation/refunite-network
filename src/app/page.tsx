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
import { Button } from "@/components/ui/button";

import en from "@/content/en";
import { useIsWearerOfHat } from "@/hooks/useIsWearerOfHat";
import { useIsMobileApp } from "@/hooks/useIsMobileApp";

function AccountPage() {
  const { address, isConnected, chainId } = useAccount();
  const { hasHat, isLoading: isHatLoading, error: isHatError } = useIsWearerOfHat();
  const isMobileApp = useIsMobileApp();

  // Not connected state
  if (!isConnected) {
    return (
      <Container>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
          <InfoText
            heading={en.page.myAccountTitle}
            message={en.page.loginPrompt}
            variant="info"
            className="text-center"
          />
          <ConnectButton variant={isMobileApp ? "mobile" : "default"} />
        </div>
      </Container>
    );
  }

  // Loading hat status
  if (isHatLoading) {
    return (
      <Container>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <InfoText
            heading="Loading account status"
            message="Checking your network membership..."
            variant="progress"
            className="text-center"
          />
        </div>
      </Container>
    );
  }

  // Error loading hat status
  if (isHatError) {
    return (
      <Container>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <InfoText
            heading="Error loading account"
            message="Failed to load your network membership status. Please try refreshing the page."
            variant="warning"
            className="text-center"
          />
        </div>
      </Container>
    );
  }

  // Main account view
  return (
    <Container>
      {/* Profile Section */}
      <ProfileSection address={address} />

      {/* Status Section */}
      <div className="mb-8">
        <StatusSection hasHat={hasHat} isHatLoading={isHatLoading} isHatError={isHatError} />
      </div>

      {/* Actions Section */}
      <div className="space-y-4">
        {hasHat === false && <ShareSection address={address} chainId={chainId} />}
        {hasHat === true && (
          <div className="pt-4">
            <Link href="/add" className="block">
              <Button className="w-full h-12 text-base font-semibold" variant="default">
                {en.page.addAnotherLeader}
                <svg
                  className="w-5 h-5 ml-2"
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
              </Button>
            </Link>
          </div>
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
