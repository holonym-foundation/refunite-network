"use client";
import React, { useState } from "react";

import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

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

  return (
    <header>
      <nav className="px-4 lg:px-6 py-5" aria-label="Main Navigation">
        <div className="flex flex-wrap justify-between items-center mx-auto max-w-screen-xl">
          <div className="w-[200px] lg:flex-none">
            <Link href="/" className="flex items-center font-bold text-indigo-800 text-2xl">
              <Image
                src="/img/logo.svg"
                alt="Refunite Network logo"
                width={100}
                height={32}
                priority
              />
            </Link>
          </div>

          <div className="w-[200px] flex justify-end items-center gap-4 lg:flex-none">
            <ConnectButton />
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-700 lg:hidden"
              onClick={() => setIsOpen(!isOpen)}
              aria-expanded={isOpen}
              aria-controls="mobile-menu"
            >
              <span className="sr-only">{isOpen ? "Close menu" : "Open menu"}</span>
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
          <div
            className={`${
              isOpen ? "block" : "hidden"
            } w-full lg:flex lg:w-auto lg:order-1 lg:absolute lg:left-1/2 lg:-translate-x-1/2 lg:justify-center`}
            id="mobile-menu"
          >
            <ul className="flex flex-col mt-4 font-medium lg:flex-row lg:space-x-8 lg:mt-0">
              {navItems.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="block py-2 pr-4 pl-3 text-indigo-800 font-semibold border-b border-gray-100 hover:bg-gray-50 lg:hover:bg-transparent lg:border-0 lg:hover:text-primary-700 lg:p-0"
                    onClick={() => setIsOpen(false)}
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
              <li className="border-b border-gray-100">
                <a
                  href="https://app.hatsprotocol.xyz/trees/11155111/639"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block py-2 pr-4 pl-3 text-indigo-800 font-semibold border-b border-gray-100 hover:bg-gray-50 lg:hover:bg-transparent lg:border-0 lg:hover:text-primary-700 lg:p-0"
                >
                  Hats tree
                </a>
              </li>
            </ul>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;
