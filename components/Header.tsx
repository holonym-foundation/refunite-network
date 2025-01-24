"use client";
import React, { useState } from "react";

import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useAccount } from "wagmi";

import { Button } from "@/components/ui/button";

import ConnectButton from "./ConnectButton";

const navItems = [
  { name: "Home", href: "/" },
  { name: "Account", href: "/user" },
  { name: "Assign Hat", href: "/assign-hat" },
  { name: "Recover role", href: "/recover-role" },
];

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { isConnected } = useAccount();

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-sm border-b">
        <div className="mx-auto max-w-2xl">
          <nav className="px-4 lg:px-6 py-4" aria-label="Main Navigation">
            <div className="flex flex-col lg:flex-col justify-between items-center gap-4">
              <div className="flex w-full justify-between items-center">
                <Link href="/" className="flex items-center">
                  <Image
                    src="/img/logo.svg"
                    alt="Refunite Network logo"
                    width={120}
                    height={48}
                    priority
                    className="h-14 w-auto"
                  />
                </Link>

                <div className="flex items-center gap-2">
                  <div className="hidden lg:flex items-center">
                    <ConnectButton />
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden"
                    onClick={() => setIsOpen(!isOpen)}
                    aria-expanded={isOpen}
                    aria-controls="mobile-menu"
                  >
                    <span className="sr-only">{isOpen ? "Close menu" : "Open menu"}</span>
                    {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                  </Button>
                </div>
              </div>

              {/* Desktop Navigation */}
              <ul className="hidden lg:flex items-center space-x-8">
                {navItems.map((item) => (
                  <li key={item.name} className="group">
                    <Link
                      href={item.href}
                      className="text-base text-muted-foreground hover:text-primary lg:hover:text-primary-700 font-medium"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
                <li className="group">
                  <a
                    href="https://app.hatsprotocol.xyz/trees/11155111/639"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-base text-muted-foreground hover:text-primary lg:hover:text-primary-700 font-medium"
                  >
                    Hats tree
                  </a>
                </li>
              </ul>
            </div>

            {/* Mobile Navigation */}
            <div
              className={`${isOpen ? "block" : "hidden"} lg:hidden w-full mt-4`}
              id="mobile-menu"
            >
              <ul className="flex flex-col">
                {navItems.map((item) => (
                  <li key={item.name} className="group">
                    <Link
                      href={item.href}
                      className="block py-2 text-base text-muted-foreground hover:text-primary font-medium"
                      onClick={() => setIsOpen(false)}
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
                <li className="group">
                  <a
                    href="https://app.hatsprotocol.xyz/trees/11155111/639"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block py-2 text-base text-muted-foreground hover:text-primary font-medium"
                  >
                    Hats tree
                  </a>
                </li>
              </ul>
            </div>
          </nav>
        </div>
      </header>

      {/* Floating wallet button for mobile with enhanced shadow */}
      <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="bg-white rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.15)] p-2 px-6 flex items-center gap-6">
          {!isConnected && (
            <div className="animate-float-x">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-primary"
              >
                <path
                  d="M5 12H19M19 12L12 5M19 12L12 19"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          )}
          <ConnectButton />
        </div>
      </div>
    </>
  );
};

export default Header;
