"use client";
import { Header } from "@/components/Header";
import { Toaster } from "@/components/ui/toaster";

import { ContextProvider } from "@/context";
import { useAccount } from "wagmi";

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { address } = useAccount();

  return (
    <>
      <Header />
      <main className="mx-auto lg:max-w-3xl px-0 lg:px-6 min-h-screen">
        <Toaster />
        {children}
      </main>
    </>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta
          name="google-site-verification"
          content="Ek8qS8p0iYQQxYWW0d52vgKAs4KH3S4DVNCSn9btJFA"
        />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
        />
        <meta name="theme-color" content="#000000" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Refunite Network" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/logo.svg" />
      </head>
      <body>
        <ContextProvider>
          <LayoutContent>{children}</LayoutContent>
        </ContextProvider>
      </body>
    </html>
  );
}
