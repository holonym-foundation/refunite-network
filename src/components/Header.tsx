"use client";
import { useState } from "react";

import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { ConnectButton } from "./ConnectButton";
import { NetworkTag } from "./NetworkTag";
import { Button } from "./ui/button";

import en from "@/content/en";

const navItems = [
  { name: en.header.nav.myAccount, href: "/" },
  { name: en.header.nav.addLeader, href: "/add" },
];

export function Header() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-sm border-b">
        <div className="mx-auto max-w-2xl">
          <nav className="px-4 lg:px-6 py-4" aria-label="Main Navigation">
            <div className="flex flex-col lg:flex-col justify-between items-center gap-4">
              <div className="flex w-full justify-between items-center">
                <div className="flex flex-row items-center gap-2">
                  <Link href="/" className="flex items-center">
                    <Image
                      src="/logo.svg"
                      alt="Refunite Relay ID logo"
                      width={120}
                      height={48}
                      priority
                      className="h-14 w-auto"
                    />
                  </Link>
                  <NetworkTag />
                </div>

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
                    <span className="sr-only">
                      {isOpen ? en.header.menu.close : en.header.menu.open}
                    </span>
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
                <li className="mt-4">
                  <ConnectButton />
                </li>
              </ul>
            </div>
          </nav>
        </div>
      </header>
    </>
  );
}
