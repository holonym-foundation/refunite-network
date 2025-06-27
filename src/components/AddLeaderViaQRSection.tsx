import { addLeaderViaSignedTypedData } from "@/app/actions/defender";
import { QrScannerDialog } from "@/components/QrScannerDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useSafeOwner } from "@/hooks/useSafeOwner";
import { useSilkSigner } from "@/hooks/useSilkSigner";
import { createNetworkInviteTypedData, generateNonce } from "@/lib/eip712";
import { QrCode } from "lucide-react";
import { useState } from "react";
import { isAddress } from "viem";
import { useAccount } from "wagmi";

interface AddLeaderViaQRSectionProps {
  onSuccess?: (recipient: string) => void;
}

export function AddLeaderViaQRSection({ onSuccess }: AddLeaderViaQRSectionProps) {
  const { address: account, chainId } = useAccount();
  const { toast } = useToast();
  const { isMultisigOwner, isLoading: isSafeLoading } = useSafeOwner();
  const { signTypedData, isConnected: isSilkConnected } = useSilkSigner();
  const [recipient, setRecipient] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [scannedViaQR, setScannedViaQR] = useState(false);

  const handleScan = (results: any) => {
    const qrCode = results[0];
    if (!qrCode) return;
    const { rawValue } = qrCode;
    const address = rawValue.split(":")[1];
    if (!isAddress(address)) {
      toast({
        variant: "destructive",
        title: "Error in QR code",
        description: `Invalid address: ${address}`,
      });
      return;
    }
    setRecipient(address);
    setShowScanner(false);
    setScannedViaQR(true);
  };

  const handleScanError = (error: unknown) => {
    if (error instanceof Error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error while scanning",
        description: error.message,
      });
    } else {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error while scanning",
        description: "An unknown error occurred",
      });
    }
  };

  const handleAddLeaderViaSignature = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (!account || !isSilkConnected || !chainId) throw new Error("Not connected to Silk wallet");

      if (!isAddress(recipient)) {
        throw new Error("Invalid recipient address");
      }

      const nonce = generateNonce();
      const typedData = createNetworkInviteTypedData({
        inviterAddress: account,
        nonce,
        chainId,
      });
      const signature = await signTypedData(typedData);
      const result = await addLeaderViaSignedTypedData(recipient, typedData, signature);

      if (result.error) {
        throw new Error(result.error);
      }

      setRecipient("");
      setScannedViaQR(false);
      toast({
        title: "Success",
        description: `Successfully added leader ${recipient} (via QR)`,
      });
      onSuccess?.(recipient);
    } catch (error) {
      console.error("Error adding leader via QR:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleAddLeaderViaSignature} className="py-4">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="address">Their address</Label>
          <div className="flex gap-2">
            <Input
              id="address"
              type="text"
              placeholder="0x..."
              value={recipient}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRecipient(e.target.value)}
              required
            />
            <QrScannerDialog
              open={showScanner}
              onOpenChange={setShowScanner}
              onScan={handleScan}
              onError={handleScanError}
              trigger={
                <Button type="button" variant="outline" size="icon" className="shrink-0">
                  <QrCode className="h-4 w-4" />
                </Button>
              }
            />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Button
          type="submit"
          disabled={isLoading || !isMultisigOwner || isSafeLoading}
          className="mt-8"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Adding leader...
            </div>
          ) : (
            "Add leader"
          )}
        </Button>
        {isLoading && (
          <span className="text-secondary text-sm mt-8">
            This may take a moment. Please keep this page open.
          </span>
        )}
      </div>
    </form>
  );
}
