"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { InfoText } from "@/components/ui/InfoText";
import { Container } from "@/components/ui/Container";
import { verifyInvite, VerifyInviteResult } from "@/app/actions/invite";
import { getInviteErrorCopy } from "@/lib/utils";
import en from "@/content/en";

interface InviteVerificationProps {
  onVerificationComplete: (result: VerifyInviteResult) => void;
}

export function InviteVerification({ onVerificationComplete }: InviteVerificationProps) {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const [verificationResult, setVerificationResult] = useState<VerifyInviteResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const verifyInviteCode = async () => {
      if (!code) {
        setVerificationResult({
          success: false,
          error: "No invite code provided",
        });
        setIsLoading(false);
        return;
      }

      try {
        console.log("Verifying invite code", code);
        console.log("Making fetch request to /api/invites/verify");

        const result = await fetch(`/api/invites/verify`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code,
          }),
        });

        console.log("Fetch completed, status:", result.status);
        console.log("Invite result", result);

        const data = await result.json();
        console.log("JSON parsing completed");
        console.log("Invite data", data);

        setVerificationResult(data);
        onVerificationComplete(data);
      } catch (err) {
        console.error("Error in invite verification:", err);
        const errorResult = {
          success: false,
          error: `Failed to verify invite: ${err instanceof Error ? err.message : "Unknown error"}`,
        };
        setVerificationResult(errorResult);
        onVerificationComplete(errorResult);
      } finally {
        setIsLoading(false);
      }
    };

    verifyInviteCode();
  }, [code, onVerificationComplete]);

  if (isLoading) {
    return (
      <Container>
        <InfoText
          heading={en.invitePage.headings.verifying}
          message={en.invitePage.prompts.processing}
          variant="progress"
        />
      </Container>
    );
  }

  if (!verificationResult?.success) {
    const { heading, message } = getInviteErrorCopy(verificationResult?.error);
    return (
      <Container>
        <InfoText heading={heading} message={message} variant="warning" />
      </Container>
    );
  }

  return null; // Verification successful, let parent handle the next step
}
