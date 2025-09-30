"use client";

import { useAccount } from "wagmi";
import { ConnectButton } from "@/components/ConnectButton";
import { InfoText } from "@/components/ui/InfoText";
import { Container } from "@/components/ui/Container";
import { useIsWearerOfHat } from "@/hooks/useIsWearerOfHat";
import en from "@/content/en";

interface WalletConnectionProps {
  expiresAt?: string | null;
  onWalletReady: () => void;
}

export function WalletConnection({ expiresAt, onWalletReady }: WalletConnectionProps) {
  const { address, isConnecting } = useAccount();
  const { hasHat, isLoading: isHatLoading } = useIsWearerOfHat();

  // No account connected: show connect prompt
  if (!address && !isConnecting) {
    return (
      <Container>
        <div className="flex flex-col items-center gap-4">
          <InfoText heading="Log in to accept invite" variant="info" className="mb-4">
            Please log in to the RelayID network to accept this invite.
          </InfoText>
          {expiresAt && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
              <p className="text-sm text-blue-800">
                <strong>Expires:</strong> {new Date(expiresAt).toLocaleString()}
              </p>
            </div>
          )}
          <ConnectButton />
        </div>
      </Container>
    );
  }

  // Account connected, checking onboarding status
  if (isHatLoading) {
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

  // Account is already onboarded
  if (hasHat === true) {
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

  // Wallet is ready for onboarding
  onWalletReady();
  return null;
}
