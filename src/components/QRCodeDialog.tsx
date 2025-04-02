import { QrCode } from "lucide-react";
import Link from "next/link";
import QRCode from "react-qr-code";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
          <DialogTitle>Share QR Code</DialogTitle>
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
                <p className="text-sm text-slate-400">Log in to view QR code</p>
              </div>
            )}
          </div>
          <div className="space-y-2 text-center">
            <p className="text-sm text-muted-foreground">
              Share this QR code with other community leaders to add them to the network:
            </p>
            <p className="text-sm text-muted-foreground">
              They can scan this code on the Add Leader page or enter your address manually
            </p>
            <Link
              href="/add"
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 border-b border-blue-600"
            >
              Go to Add Leader page
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M5 12H19M19 12L12 5M19 12L12 19"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
