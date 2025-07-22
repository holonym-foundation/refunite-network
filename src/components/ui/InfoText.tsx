import * as React from "react";
import { cn } from "@/lib/utils";
import { InfoIcon, AlertTriangle, Loader2 } from "lucide-react";

interface InfoTextProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  heading?: string;
  message?: string;
  variant?: "info" | "warning" | "progress";
}

export const InfoText = React.forwardRef<HTMLDivElement, InfoTextProps>(
  ({ children, className, heading, message, variant = "info", ...props }, ref) => {
    let icon = null;
    let variantClass = "";
    switch (variant) {
      case "warning":
        icon = <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 shrink-0" />;
        variantClass = "bg-yellow-50 border-yellow-200 text-yellow-800";
        break;
      case "progress":
        icon = <Loader2 className="h-5 w-5 text-blue-500 animate-spin mr-2 shrink-0" />;
        variantClass = "bg-blue-50 border-blue-200 text-blue-700";
        break;
      case "info":
      default:
        icon = <InfoIcon className="h-5 w-5 text-blue-500 mr-2 shrink-0" />;
        variantClass = "bg-slate-50 border-slate-200 text-slate-700";
        break;
    }
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-start rounded-lg p-4 text-base leading-relaxed border whitespace-pre-line",
          variantClass,
          className
        )}
        {...props}
      >
        {icon}
        <div>
          {heading && <div className="font-semibold text-lg mb-1">{heading}</div>}
          {message && <span>{message}</span>}
          {children && <span>{children}</span>}
        </div>
      </div>
    );
  }
);
InfoText.displayName = "InfoText";
