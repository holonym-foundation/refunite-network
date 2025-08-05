"use client";

import { Suspense, useState } from "react";
import { VerifyInviteResult } from "@/app/actions/invite";

import {
  InviteVerification,
  WalletConnection,
  OnboardingFlow,
  InvitePageSkeleton,
} from "@/components/invite";

export default function InvitePage() {
  const [verificationResult, setVerificationResult] = useState<VerifyInviteResult | null>(null);
  const [isWalletReady, setIsWalletReady] = useState(false);

  const handleVerificationComplete = (result: VerifyInviteResult) => {
    setVerificationResult(result);
  };

  const handleWalletReady = () => {
    setIsWalletReady(true);
  };

  // If verification failed, show error (handled by InviteVerification)
  if (verificationResult && !verificationResult.success) {
    return null; // InviteVerification will handle the error display
  }

  // If verification succeeded and wallet is ready, show onboarding flow
  if (verificationResult?.success && isWalletReady) {
    return (
      <Suspense fallback={<InvitePageSkeleton />}>
        <OnboardingFlow verificationResult={verificationResult} />
      </Suspense>
    );
  }

  // If verification succeeded but wallet not ready, show wallet connection
  if (verificationResult?.success && !isWalletReady) {
    return (
      <Suspense fallback={<InvitePageSkeleton />}>
        <WalletConnection
          expiresAt={verificationResult.expiresAt}
          onWalletReady={handleWalletReady}
        />
      </Suspense>
    );
  }

  // Default: show invite verification
  return (
    <Suspense fallback={<InvitePageSkeleton />}>
      <InviteVerification onVerificationComplete={handleVerificationComplete} />
    </Suspense>
  );
}
