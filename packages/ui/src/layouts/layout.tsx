import React from "react";
import { Header } from "../components/Header";
import { Toaster } from "../components/ui/toaster";

interface RootLayoutProps {
  children: React.ReactNode;
  variant: "landing" | "app";
}

export function RootLayout({ children, variant }: RootLayoutProps) {
  return (
    <>
      {variant === "app" && <Header />}
      <main className="mx-auto lg:max-w-3xl px-0 lg:px-6 min-h-screen">
        <Toaster />
        {children}
      </main>
    </>
  );
}