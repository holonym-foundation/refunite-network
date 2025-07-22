import * as React from "react";
import { cn } from "@/lib/utils";

interface InfoTextProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const InfoText = React.forwardRef<HTMLDivElement, InfoTextProps>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "bg-slate-50 border border-slate-200 rounded-lg p-4 text-base leading-relaxed text-slate-700 whitespace-pre-line",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
InfoText.displayName = "InfoText";
