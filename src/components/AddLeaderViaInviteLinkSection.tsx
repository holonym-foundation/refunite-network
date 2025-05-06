import { Button } from "@/components/ui/button";
import { useState } from "react";
import { ethers } from "ethers";
import { useAccount } from "wagmi";
import { useSilkSigner } from "@/hooks/useSilkSigner";
import { useToast } from "@/components/ui/use-toast";
import { getInviteSignatureMessage } from "@/lib/signature";

interface InviteLinkSectionProps {
  disabled?: boolean;
  onSuccess?: (inviteLink: string) => void;
}

export function AddLeaderViaInviteLinkSection({ disabled, onSuccess }: InviteLinkSectionProps) {
  const { address: account } = useAccount();
  const { signMessage, isConnected: isSilkConnected } = useSilkSigner();
  const { toast } = useToast();
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [inviteLink, setInviteLink] = useState<string>("");

  const handleGenerateInvite = async () => {
    if (!account || !isSilkConnected) return;
    setIsGeneratingInvite(true);
    try {
      const nonce = ethers.hexlify(ethers.randomBytes(32));
      const message = getInviteSignatureMessage(nonce);
      const signature = await signMessage(message);
      const response = await fetch("/api/invites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          signature,
          message,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate invite");
      }
      const { inviteCode } = await response.json();
      const link = `${window.location.origin}/invite/${inviteCode}`;
      setInviteLink(link);
      toast({
        title: "Success",
        description: "Invite link generated!",
      });
      onSuccess?.(link);
    } catch (error) {
      console.error("Error generating invite:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate invite link",
      });
    } finally {
      setIsGeneratingInvite(false);
    }
  };

  const handleCopyLink = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    toast({
      title: "Copied!",
      description: "Invite link copied to clipboard",
    });
  };

  const handleShareWhatsApp = () => {
    if (!inviteLink) return;
    const message = `Join me on the RelayId Network! Use this invite link: ${inviteLink}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  return (
    <div className="mt-8 pt-8 border-t border-slate-200">
      <h2 className="text-lg font-semibold mb-4">Send invite link</h2>
      <div className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={handleGenerateInvite}
            disabled={isGeneratingInvite || disabled || !!inviteLink}
            className="shrink-0"
          >
            {isGeneratingInvite ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Generating...
              </div>
            ) : (
              "Generate invite link"
            )}
          </Button>
          {inviteLink && (
            <>
              <Button onClick={handleCopyLink} variant="outline" className="shrink-0">
                Copy link
              </Button>
              <Button onClick={handleShareWhatsApp} variant="outline" className="shrink-0">
                Share on WhatsApp
              </Button>
            </>
          )}
        </div>
        {inviteLink && (
          <div className="text-sm text-slate-500">
            <p>Invite link expires in 24 hours</p>
          </div>
        )}
      </div>
    </div>
  );
}
