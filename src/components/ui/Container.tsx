import * as React from "react";
import { cn } from "@/lib/utils";

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Container({ children, className, ...props }: ContainerProps) {
  return (
    <div className={cn("min-h-screen py-0 sm:py-8 px-0 sm:px-6 md:px-8", className)} {...props}>
      <div className="max-w-3xl mx-0 sm:mx-auto">
        <div className="bg-white p-4 pb-16 sm:p-8 sm:rounded-xl sm:border sm:border-slate-300">
          <div className="text-center">{children}</div>
        </div>
      </div>
    </div>
  );
}
