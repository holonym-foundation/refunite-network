import { useState } from "react";

import { Copy, InfoIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import en from "@/content/en";

interface ProfileSectionProps {
  address?: string;
}

export function ProfileSection({ address }: ProfileSectionProps) {
  const [showCopied, setShowCopied] = useState(false);

  return (
    <div className="py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <h2 className="text-xl sm:text-lg font-semibold mb-2">{en.profile.myAccount}</h2>
            <p className="text-base sm:text-sm font-mono font-semibold text-secondary break-all">
              {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : en.common.unknown}
            </p>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-6 sm:w-6 flex-shrink-0">
                <InfoIcon className="h-5 w-5 sm:h-4 sm:w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-2">
                <h4 className="font-medium">{en.profile.relayIdTitle}</h4>
                <p className="text-sm text-muted-foreground">{en.profile.relayIdDescription}</p>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <div className="relative">
          <Button
            variant="outline"
            size="lg"
            className="h-12 px-4 sm:h-10 sm:px-3 w-full sm:w-auto"
            onClick={() => {
              if (address) {
                navigator.clipboard.writeText(address);
                setShowCopied(true);
                setTimeout(() => setShowCopied(false), 2000);
              }
            }}
          >
            <Copy className="h-5 w-5 mr-2 sm:mr-0 sm:h-4 sm:w-4" />
            <span className="sm:hidden">{en.common.clickToCopyAddress}</span>
          </Button>
          {showCopied && (
            <div className="absolute right-0 top-full mt-2 bg-slate-100 text-slate-600 px-3 py-2 rounded-lg text-sm whitespace-nowrap shadow-lg z-10">
              {en.common.addressCopied}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
