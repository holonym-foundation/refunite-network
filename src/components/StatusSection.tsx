import { InfoIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";

import en from "@/content/en";

interface StatusSectionProps {
  hasHat: boolean | null;
  isHatLoading: boolean;
  isHatError: boolean;
}

export function StatusSection({ hasHat, isHatLoading, isHatError }: StatusSectionProps) {
  return (
    <div className="py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">{en.status.status}</h3>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <InfoIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-2">
                <h4 className="font-medium">{en.status.networkStatus}</h4>
                <p className="text-sm text-muted-foreground">
                  {en.status.networkStatusDescription}
                </p>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        {isHatLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : isHatError ? (
          <Badge
            variant="destructive"
            className="bg-red-200 text-red-700 gap-1 px-3 py-2 shadow-sm font-semibold tracking-wide"
          >
            {en.status.errorLoadingStatus}
          </Badge>
        ) : hasHat ? (
          <Badge
            variant="default"
            className="bg-green-200 text-green-700 gap-1 px-3 py-2 shadow-sm font-semibold tracking-wide"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M20 6L9 17L4 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {en.status.youAreALeader}
          </Badge>
        ) : (
          <Badge
            variant="destructive"
            className="bg-red-200 text-red-700 gap-1 px-3 py-2 shadow-sm font-semibold tracking-wide"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M18 6L6 18M6 6L18 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {en.status.notALeader}
          </Badge>
        )}
      </div>
      {!isHatLoading && !hasHat && (
        <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <h4 className="font-medium mb-2">{en.status.onboardingTitle}</h4>
          <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600">
            {en.status.onboardingSteps.map((step, idx) => (
              <li key={idx}>{step}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
