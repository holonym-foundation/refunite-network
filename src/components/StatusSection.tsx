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
    <div className="py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <h3 className="text-xl sm:text-lg font-semibold">{en.status.status}</h3>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-6 sm:w-6 flex-shrink-0">
                <InfoIcon className="h-5 w-5 sm:h-4 sm:w-4" />
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
          <Skeleton className="h-10 w-32 sm:h-8 sm:w-24" />
        ) : isHatError ? (
          <Badge
            variant="destructive"
            className="bg-red-200 text-red-700 gap-2 px-4 py-3 sm:px-3 sm:py-2 shadow-sm font-semibold tracking-wide text-base sm:text-sm"
          >
            {en.status.errorLoadingStatus}
          </Badge>
        ) : hasHat ? (
          <Badge
            variant="default"
            className="bg-green-200 text-green-700 gap-2 px-4 py-3 sm:px-3 sm:py-2 shadow-sm font-semibold tracking-wide text-base sm:text-sm"
          >
            <svg
              className="w-5 h-5 sm:w-4 sm:h-4"
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
            className="bg-red-200 text-red-700 gap-2 px-4 py-3 sm:px-3 sm:py-2 shadow-sm font-semibold tracking-wide text-base sm:text-sm"
          >
            <svg
              className="w-5 h-5 sm:w-4 sm:h-4"
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
        <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <h4 className="font-medium mb-3 text-lg sm:text-base">{en.status.onboardingTitle}</h4>
          <ol className="list-decimal list-inside space-y-3 text-base sm:text-sm text-slate-600">
            {en.status.onboardingSteps.map((step, idx) => (
              <li key={idx} className="leading-relaxed">
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
