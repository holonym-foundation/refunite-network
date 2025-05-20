import { Badge } from "@/components/ui/badge";
import { ReactNode } from "react";

interface PermissionBadgeProps {
  isAllowed: boolean;
  loading?: boolean;
}

export function PermissionBadge({ isAllowed, loading }: PermissionBadgeProps) {
  if (loading) {
    return (
      <span className="text-sm text-muted-foreground font-medium">Checking permissions...</span>
    );
  }
  return isAllowed ? (
    <Badge variant="default" className="bg-green-100 text-green-700 flex items-center gap-1">
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M20 6L9 17L4 12"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Allowed
    </Badge>
  ) : (
    <Badge variant="destructive" className="bg-red-100 text-red-700 flex items-center gap-1">
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M18 6L6 18M6 6L18 18"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Not allowed
    </Badge>
  );
}
