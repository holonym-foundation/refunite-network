import { QrCode } from "lucide-react";
import Link from "next/link";
import QRCode from "react-qr-code";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import en from "@/content/en";

interface QRCodeDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  address?: string;
  chainId?: number;
}

export function QRCodeDialog({ isOpen, onOpenChange, address, chainId }: QRCodeDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{en.qrCodeDialog.shareQrCode}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center space-y-4 p-4">
          <div className="p-4 bg-white border border-slate-200 rounded-xl">
            {address && chainId ? (
              <QRCode
                value={`${chainId}:${address}`}
                size={200}
                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                viewBox={`0 0 256 256`}
              />
            ) : (
              <div className="w-[200px] h-[200px] bg-slate-100 rounded-lg flex items-center justify-center">
                <p className="text-sm text-slate-400">{en.qrCodeDialog.loginToViewQr}</p>
              </div>
            )}
          </div>
          <div className="space-y-2 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              {en.qrCodeDialog.showQrInstruction}
            </p>
            <p className="text-sm font-medium text-muted-foreground">
              {en.qrCodeDialog.scanInstruction}
              <Link href="/add" className="text-blue-600 hover:text-blue-800">
                {en.qrCodeDialog.addLeaderPage}
              </Link>
              {en.qrCodeDialog.pageSuffix}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
