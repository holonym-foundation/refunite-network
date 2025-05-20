import { Scanner, type IDetectedBarcode } from "@yudiel/react-qr-scanner";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ReactNode } from "react";

interface QrScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (results: IDetectedBarcode[]) => void;
  onError?: (error: unknown) => void;
  trigger: ReactNode;
  children?: ReactNode;
}

export function QrScannerDialog({
  open,
  onOpenChange,
  onScan,
  onError,
  trigger,
  children,
}: QrScannerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <div className="pt-4">
          <Scanner onScan={onScan} onError={onError} />
        </div>
        {children}
      </DialogContent>
    </Dialog>
  );
}
