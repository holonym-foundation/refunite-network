"use client";

import { useEffect, useState } from "react";

import { useParams } from "next/navigation";
import { useAccount } from "wagmi";

import { ConnectButton } from "@/components/ConnectButton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

import { verifyInvite } from "@/app/actions/invite";
import { useHatsInteractions } from "@/hooks/useHatsInteractions";

export default function InvitePage() {
  const { code } = useParams();
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  const { hatsInteractions, isConnected: isHatsConnected } = useHatsInteractions();
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
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
    if (!address || !hatsInteractions) return;

    setIsLoading(true);
    try {
      // Get the verified invite details
      const verifyResult = await verifyInvite(code as string);
      if (!verifyResult.success || !verifyResult.signature) {
        throw new Error(verifyResult.error || "Invalid invite");
      }

      const onboardResult = await hatsInteractions.inviteUser(
        address,
        verifyResult.signature,
        verifyResult.inviterAddress!,
        verifyResult.nonce!
      );

      if (!onboardResult.success) {
        throw onboardResult.error;
      }

      setIsSuccess(true);
    } catch (error) {
      console.error("Error accepting invite:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to accept invite",
      });
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
                <h1 className="text-2xl font-semibold">Success!</h1>
              </div>
              <p className="text-muted-foreground mb-6">
                You have been successfully onboarded as a leader!
              </p>
              <Button asChild>
                <a href={`/`}>View your account</a>
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
              <h1 className="text-2xl font-semibold mb-4">Verifying invite...</h1>
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
              <h1 className="text-2xl font-semibold mb-4">Invalid Invite</h1>
              <p className="text-muted-foreground">{error || "This invite is no longer valid."}</p>
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
              <h1 className="text-2xl font-semibold mb-4">Accept Invite</h1>
              <p className="text-muted-foreground mb-4">
                Please login or sign up to be accepted as a leader.
              </p>
              <div className="flex justify-center">
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
          <div className="text-center">
            <h1 className="text-2xl font-semibold mb-4">Accept Invite</h1>
            <p className="text-muted-foreground mb-8">
              Please accept the invite to join the Relay Network as a leader.
            </p>
            <Button
              onClick={handleAcceptInvite}
              disabled={isLoading || !isHatsConnected}
              className="w-full sm:w-auto"
            >
              {isLoading ? "Processing..." : "Accept Invite"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
