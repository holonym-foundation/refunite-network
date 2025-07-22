"use client";

import { useEffect, useState } from "react";

import { useParams } from "next/navigation";
import { useAccount } from "wagmi";

import { ConnectButton } from "@/components/ConnectButton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { InfoText } from "@/components/ui/InfoText";
import { OnboardingProgress, OnboardingStep } from "@/components/OnboardingProgress";

import { addLeaderViaSignedTypedData } from "@/app/actions/defender";
import { verifyInvite } from "@/app/actions/invite";
import en from "@/content/en";
import { Hash } from "viem";

export default function InvitePage() {
  const { code } = useParams();
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [onboardingStage, setOnboardingStage] = useState<number>(0); // 0: Starting, 1: Awaiting, 2: Completed
  const [isVerifying, setIsVerifying] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      const onboardResult = await addLeaderViaSignedTypedData(
        address,
        verifyResult.typedData,
        verifyResult.signature as Hash
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
      <div className="min-h-screen py-0 sm:py-8 px-0 sm:px-6 md:px-8">
        <div className="max-w-3xl mx-0 sm:mx-auto">
          <div className="bg-white p-4 pb-16 sm:p-8 sm:rounded-xl sm:border sm:border-slate-300">
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
          </div>
        </div>
      </div>
    );
  }

  if (isVerifying) {
    return (
      <div className="min-h-screen py-0 sm:py-8 px-0 sm:px-6 md:px-8">
        <div className="max-w-3xl mx-0 sm:mx-auto">
          <div className="bg-white p-4 pb-16 sm:p-8 sm:rounded-xl sm:border sm:border-slate-300">
            <div className="text-center">
              <h1 className="text-2xl font-semibold mb-4">{en.invitePage.headings.verifying}</h1>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isValid) {
    return (
      <div className="min-h-screen py-0 sm:py-8 px-0 sm:px-6 md:px-8">
        <div className="max-w-3xl mx-0 sm:mx-auto">
          <div className="bg-white p-4 pb-16 sm:p-8 sm:rounded-xl sm:border sm:border-slate-300">
            <div className="text-center">
              <h1 className="text-2xl font-semibold mb-4">{en.invitePage.headings.invalid}</h1>
              <p className="text-muted-foreground">{error || en.invitePage.prompts.invalid}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen py-0 sm:py-8 px-0 sm:px-6 md:px-8">
        <div className="max-w-3xl mx-0 sm:mx-auto">
          <div className="bg-white p-4 pb-16 sm:p-8 sm:rounded-xl sm:border sm:border-slate-300">
            <div className="text-center">
              <h1 className="text-2xl font-semibold mb-4">{en.invitePage.headings.accept}</h1>
              <p className="text-muted-foreground mb-4">{en.invitePage.prompts.login}</p>
              <div className="flex justify-center">
                <ConnectButton />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main accept UI
  return (
    <div className="min-h-screen py-0 sm:py-8 px-0 sm:px-6 md:px-8">
      <div className="max-w-3xl mx-0 sm:mx-auto">
        <div className="bg-white p-4 pb-16 sm:p-8 sm:rounded-xl sm:border sm:border-slate-300">
          <div className="text-center">
            <h1 className="text-2xl font-semibold mb-4">{en.invitePage.headings.accept}</h1>
            {/* Onboarding progress stepper with step descriptions */}
            {(isLoading || onboardingStage > 0) && (
              <div className="mb-6 flex justify-center">
                <OnboardingProgress steps={onboardingSteps} currentStep={onboardingStage} />
              </div>
            )}
            {/* Only show info text if not loading/onboarding */}
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
          </div>
        </div>
      </div>
    </div>
  );
}
