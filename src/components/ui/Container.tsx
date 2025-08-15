"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import { useIsMobileApp } from "@/hooks/useIsMobileApp";

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Container({ children, className, ...props }: ContainerProps) {
  const isMobileApp = useIsMobileApp();

  return (
    <div className={cn("min-h-screen py-0 px-0", className)} {...props}>
      <div className="max-w-3xl mx-auto">
        <div
          className={cn(
            "bg-white p-4 sm:p-8 sm:rounded-xl sm:border sm:border-slate-300",
            isMobileApp ? "pb-24" : "pb-20"
          )}
        >
          <div className="flex flex-col justify-center w-full mx-auto">{children}</div>
        </div>
      </div>
    </div>
  );
}
