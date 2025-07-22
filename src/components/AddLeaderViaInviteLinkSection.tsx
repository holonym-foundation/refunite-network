import { createInvite } from "@/app/actions/invite";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useSilkSigner } from "@/hooks/useSilkSigner";
import { INVITE_TTL_SECONDS } from "@/lib/constants";
import { createNetworkInviteTypedData, generateNonce } from "@/lib/eip712";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { useAccount } from "wagmi";
import en from "@/content/en";
import { InfoText } from "@/components/ui/InfoText";
import { getAuditDeviceInfo } from "@/lib/utils/device-info";

interface InviteLinkSectionProps {
  disabled?: boolean;
}

export function AddLeaderViaInviteLinkSection({ disabled }: InviteLinkSectionProps) {
  const { address: account, chainId } = useAccount();
  const { signTypedData, isConnected: isSilkConnected } = useSilkSigner();
  const { toast } = useToast();
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [inviteLink, setInviteLink] = useState<string>("");

  const handleGenerateInvite = async () => {
    if (!account || !isSilkConnected || !chainId) return;
    setIsGeneratingInvite(true);
    try {
      const nonce = generateNonce();
      const typedData = createNetworkInviteTypedData({
        inviterAddress: account,
        nonce,
        chainId,
      });
      const signature = await signTypedData(typedData);

      // Get client request info for audit logging
      const deviceInfo = getAuditDeviceInfo();

      const result = await createInvite(account, signature, nonce, typedData, deviceInfo);

      if (!result.success) {
        throw new Error(result.error || "Failed to generate invite");
      }

      const link = `${window.location.origin}/invite/${result.inviteCode}`;
      setInviteLink(link);
      toast({
        title: "Invite link generated!",
        description: "Send this link to the leader you want to add to the network",
      });
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
    const message = `Join me on the RelayID Network! RelayID is a decentralized identity system that gives refugees control over their personal data while unlocking access to critical resources like aid, jobs, and financial services. Use this invite link to join: ${inviteLink}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  const inviteExpiryText = formatDistanceToNow(new Date(Date.now() + INVITE_TTL_SECONDS * 1000), {
    addSuffix: true,
  });

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
        <InfoText className="mt-2 text-sm">{en.addPage.prompts.singleUseInvite}</InfoText>
        {inviteLink && (
          <div className="text-sm text-slate-500">
            <p>Invite link expires in {inviteExpiryText}</p>
          </div>
        )}
      </div>
    </div>
  );
}
