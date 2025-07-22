import React from "react";
import { cn } from "@/lib/utils";

export interface OnboardingStep {
  title: string;
  description: string;
}

interface OnboardingProgressProps {
  steps: OnboardingStep[];
  currentStep: number; // 0-based index
  className?: string;
}

/**
 * OnboardingProgress renders a horizontal stepper for onboarding flows.
 * Uses TailwindCSS and shadcn styling conventions.
 * Accepts steps as an array of { title, description } objects.
 */
export const OnboardingProgress: React.FC<OnboardingProgressProps> = ({
  steps,
  currentStep,
  className = "",
}) => {
  const current = steps[currentStep] || steps[0];
  return (
    <div className={`w-full flex flex-col items-center ${className}`}>
      <ol className="flex items-center justify-center gap-4 sm:gap-8">
        {steps.map((step, idx) => {
          const isCompleted = idx < currentStep;
          const isActive = idx === currentStep;
          return (
            <li key={step.title} className="flex items-center gap-2">
              <span
                className={cn(
                  "flex items-center justify-center h-7 w-7 rounded-full border-2 text-sm font-medium transition-colors",
                  {
                    "bg-green-500 border-green-500 text-white": isCompleted,
                    "bg-blue-600 border-blue-600 text-white": isActive,
                    "bg-white border-slate-300 text-slate-400": !isActive && !isCompleted,
                  }
                )}
                aria-current={isActive ? "step" : undefined}
              >
                {isCompleted ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  idx + 1
                )}
              </span>
              <span
                className={cn("text-xs sm:text-sm font-medium transition-colors", {
                  "text-blue-700": isActive,
                  "text-green-600": isCompleted,
                  "text-slate-400": !isActive && !isCompleted,
                })}
              >
                {step.title}
              </span>
              {idx < steps.length - 1 && <span className="h-0.5 w-6 bg-slate-200 rounded-full" />}
            </li>
          );
        })}
      </ol>
      {/* Responsive description for current step */}
      <div className="mt-3 text-xs sm:text-base text-slate-600 text-center max-w-md">
        {current.description}
      </div>
    </div>
  );
};
