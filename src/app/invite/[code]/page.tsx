"use client";

import { useEffect, useState } from "react";

import { useParams } from "next/navigation";
import { useAccount } from "wagmi";

import { ConnectButton } from "@/components/ConnectButton";
import { OnboardingProgress, OnboardingStep } from "@/components/OnboardingProgress";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/Container";
import { InfoText } from "@/components/ui/InfoText";
import { useToast } from "@/components/ui/use-toast";

import { addLeaderViaSignedTypedData } from "@/app/actions/defender";
import { isWalletOnboarded, verifyInvite } from "@/app/actions/invite";
import en from "@/content/en";
import { getAuditDeviceInfo } from "@/lib/utils/device-info";
import { Hash } from "viem";

export default function InvitePage() {
  const { code } = useParams();
  const { address } = useAccount();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [onboardingStage, setOnboardingStage] = useState<number>(0); // 0: Starting, 1: Awaiting, 2: Completed
  const [isVerifying, setIsVerifying] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isAlreadyOnboarded, setIsAlreadyOnboarded] = useState<boolean>(false);
  const [checkingOnboarded, setCheckingOnboarded] = useState<boolean>(false);

  const onboardingSteps: OnboardingStep[] = [
    {
      title: "Starting onboarding",
      description: "Starting onboarding...",
    },
    {
      title: "Awaiting confirmation",
      description: "Awaiting confirmation from the network...",
    },
    {
      title: "Completed",
      description: "Onboarding completed!",
    },
  ];

  useEffect(() => {
    // Reset onboarding stage if code changes
    setOnboardingStage(0);
    const verifyInviteCode = async () => {
      try {
        const result = await verifyInvite(code as string);
        setIsValid(result.success);
        setError(result.error || null);
      } catch (err) {
        setError("Failed to verify invite");
      } finally {
        setIsVerifying(false);
      }
    };

    verifyInviteCode();
  }, [code]);

  useEffect(() => {
    if (!address) {
      setIsAlreadyOnboarded(false);
      return;
    }
    setCheckingOnboarded(true);
    isWalletOnboarded(address)
      .then(setIsAlreadyOnboarded)
      .finally(() => setCheckingOnboarded(false));
  }, [address]);

  const handleAcceptInvite = async () => {
    if (!address) return;
    setIsLoading(true);
    setOnboardingStage(0); // Explicitly set to starting
    try {
      setOnboardingStage(0); // Starting onboarding
      // Get the verified invite details
      const verifyResult = await verifyInvite(code as string);
      if (!verifyResult.success || !verifyResult.signature || !verifyResult.typedData) {
        throw new Error(verifyResult.error || "Invalid invite");
      }
      setOnboardingStage(1); // Awaiting confirmation

      // Get client request info for audit logging
      const deviceInfo = getAuditDeviceInfo();
      const onboardResult = await addLeaderViaSignedTypedData(
        address,
        verifyResult.typedData,
        verifyResult.signature as Hash,
        deviceInfo
      );
      if (onboardResult.error) {
        throw onboardResult.error;
      }
      setOnboardingStage(2); // Completed
      setIsSuccess(true);
    } catch (error) {
      console.error("Error accepting invite:", error);
      toast({
        variant: "destructive",
        title: en.common.error,
        description: error instanceof Error ? error.message : "Failed to accept invite",
      });
      setOnboardingStage(0); // Reset to starting on error
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <Container>
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <svg
              className="h-8 w-8 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <h1 className="text-2xl font-semibold">{en.invitePage.headings.success}</h1>
          </div>
          <p className="text-muted-foreground mb-6">{en.invitePage.prompts.onboarded}</p>
          <Button asChild>
            <a href={`/`}>{en.invitePage.prompts.viewAccount}</a>
          </Button>
        </div>
      </Container>
    );
  }

  if (!address) {
    // No account connected: only verify invite
    if (isVerifying)
      return (
        <Container>
          <InfoText
            heading={en.invitePage.headings.verifying}
            message={en.invitePage.prompts.processing}
            variant="progress"
          />
        </Container>
      );
    if (!isValid)
      return (
        <Container>
          <InfoText
            heading={en.invitePage.headings.invalid}
            message={error || en.invitePage.prompts.invalid}
            variant="warning"
          />
        </Container>
      );
    // Show prompt to connect wallet and accept invite
    return (
      <Container>
        <div className="flex flex-col items-center gap-4">
          <InfoText heading="Log in to accept invite" variant="info" className="mb-4">
            Please log in to the RelayID network to accept this invite.
          </InfoText>
          <ConnectButton />
        </div>
      </Container>
    );
  }

  if (checkingOnboarded) {
    // Account connected, checking onboarding status
    return (
      <Container>
        <InfoText
          heading={en.invitePage.prompts.checkingWalletStatus}
          message={en.invitePage.prompts.checkingWalletStatus}
          variant="info"
        />
      </Container>
    );
  }

  if (isAlreadyOnboarded) {
    // Account is already onboarded
    return (
      <Container>
        <InfoText
          heading={en.invitePage.headings.alreadyOnboarded}
          message={en.invitePage.prompts.alreadyOnboarded}
          variant="info"
        />
      </Container>
    );
  }

  // Now verify invite for connected account
  if (isVerifying)
    return (
      <Container>
        <InfoText
          heading={en.invitePage.headings.verifying}
          message={en.invitePage.prompts.processing}
          variant="progress"
        />
      </Container>
    );
  if (!isValid)
    return (
      <Container>
        <InfoText
          heading={en.invitePage.headings.invalid}
          message={error || en.invitePage.prompts.invalid}
          variant="warning"
        />
      </Container>
    );

  // Default: show main accept invite UI
  return (
    <Container>
      <h1 className="text-2xl font-semibold mb-4">{en.invitePage.headings.accept}</h1>
      {/* Onboarding progress stepper with step descriptions */}
      {(isLoading || onboardingStage > 0) && (
        <div className="mb-6 flex justify-center">
          <OnboardingProgress steps={onboardingSteps} currentStep={onboardingStage} />
        </div>
      )}
      {/* Info text for accept prompt */}
      {!(isLoading || onboardingStage > 0) && (
        <InfoText className="mb-4">{en.invitePage.prompts.accept}</InfoText>
      )}
      <Button onClick={handleAcceptInvite} disabled={isLoading} className="w-full sm:w-auto">
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            {en.invitePage.prompts.processing}
          </div>
        ) : (
          en.invitePage.prompts.acceptInvite
        )}
      </Button>
    </Container>
  );
}
