import { useState } from "react";

import { Copy, InfoIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface ProfileSectionProps {
  address?: string;
}

export function ProfileSection({ address }: ProfileSectionProps) {
  const [showCopied, setShowCopied] = useState(false);

  return (
    <div className="py-4 border-b border-slate-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div>
            <h2 className="text-lg font-semibold">My Account</h2>
            <p className="text-sm font-mono font-semibold text-secondary">
              {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Unknown"}
            </p>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <InfoIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-2">
                <h4 className="font-medium">Your RefuniteID</h4>
                <p className="text-sm text-muted-foreground">
                  This is your unique RelayId that you can share with other members. They can use it
                  to connect with you.
                </p>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (address) {
                navigator.clipboard.writeText(address);
                setShowCopied(true);
                setTimeout(() => setShowCopied(false), 2000);
              }
            }}
          >
            <Copy className="h-5 w-5" />
          </Button>
          {showCopied && (
            <div className="absolute right-full mr-2 top-1/2 transform -translate-y-1/2 bg-slate-800 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
              RefuniteID copied to clipboard
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
