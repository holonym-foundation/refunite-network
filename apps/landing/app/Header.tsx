"use client";
import React from "react";

import { Button } from "@refunite/ui";
import Image from "next/image";
import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-sm border-b">
      <div className="mx-auto max-w-2xl">
        <nav className="px-4 lg:px-6 py-4" aria-label="Main Navigation">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center">
              <Image
                src="./logo.svg"
                alt="Refunite Network logo"
                width={120}
                height={48}
                priority
                className="h-14 w-auto"
              />
            </Link>

            <Button asChild variant="default">
              <Link href="https://app.refunite-network.vercel.app">Launch App</Link>
            </Button>
          </div>
        </nav>
      </div>
    </header>
  );
}
