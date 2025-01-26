import React from "react";

import Header from "@/components/Header";
import { Toaster } from "@/components/ui/toaster";

import type { Metadata } from "next";

import ContextProvider from "@/context";

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME!,
  description: "This is a hackathon project for public goods",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="text-foreground bg-white lg:bg-slate-200">
        <ContextProvider>
          <Header />
          <main className="mx-auto lg:max-w-3xl px-0 lg:px-6 min-h-screen">
            <Toaster />
            {children}
          </main>
        </ContextProvider>
      </body>
    </html>
  );
}
