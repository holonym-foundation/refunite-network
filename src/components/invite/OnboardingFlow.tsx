"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { Hash } from "viem";

import { OnboardingProgress, OnboardingStep } from "@/components/OnboardingProgress";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/Container";
import { InfoText } from "@/components/ui/InfoText";
import { useToast } from "@/components/ui/use-toast";

import { VerifyInviteResult } from "@/app/actions/invite";
import en from "@/content/en";
import { getAuditDeviceInfo } from "@/lib/utils/device-info";
import { marshalTypedData } from "@/lib/utils/serialize";

interface OnboardingFlowProps {
  verificationResult: VerifyInviteResult;
}

export function OnboardingFlow({ verificationResult }: OnboardingFlowProps) {
  const { address } = useAccount();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [onboardingStage, setOnboardingStage] = useState<number>(0);
  const [isSuccess, setIsSuccess] = useState(false);

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

  const handleAcceptInvite = async () => {
    if (
      !address ||
      !verificationResult?.success ||
      !verificationResult.signature ||
      !verificationResult.typedData
    ) {
      return;
    }

    setIsLoading(true);
    setOnboardingStage(0);

    try {
      setOnboardingStage(1); // Awaiting confirmation

      // Get client request info for audit logging
      const deviceInfo = getAuditDeviceInfo();

      const onboardResult = await fetch("/api/onboarding/invite", {
        method: "POST",
        body: JSON.stringify({
          recipient: address,
          typedData: marshalTypedData(verificationResult.typedData),
          signature: verificationResult.signature as Hash,
          deviceInfo,
        }),
      });
      const data = await onboardResult.json();

      if (data.error) {
        throw new Error(data.error);
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
        <>
          <InfoText className="mb-4">{en.invitePage.prompts.accept}</InfoText>
          {verificationResult.expiresAt && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Expires:</strong> {new Date(verificationResult.expiresAt).toLocaleString()}
              </p>
            </div>
          )}
        </>
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
