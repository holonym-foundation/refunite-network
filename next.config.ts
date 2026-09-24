import { type NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

// @human.tech/waap-sdk lazily imports Reown AppKit (`await import(...)`) only for its
// WalletConnect login method, which this app does not enable (see silk-config.ts).
// Bundlers still follow that import into AppKit -> @base-org/account -> @coinbase/cdp-sdk,
// whose optional @x402/* peers are not installed and break the build. Stub AppKit out.
const EMPTY_MODULE = "./src/lib/stubs/empty-module.ts";
const optionalPeerStubs = ["@reown/appkit", "@reown/appkit-adapter-ethers"];

console.log("isProduction", isProduction);

const nextConfig: NextConfig = {
  // Image configuration
  images: {
    domains: ["ipfs.io", "github.com"],
  },

  // Package transpilation
  transpilePackages: ["@refunite/ui", "ua-parser-js"],

  // Stub optional peers (see optionalPeerStubs)
  turbopack: {
    resolveAlias: Object.fromEntries(
      optionalPeerStubs.flatMap((name) => [
        [name, EMPTY_MODULE],
        [`${name}/*`, EMPTY_MODULE],
      ])
    ),
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      ...Object.fromEntries(optionalPeerStubs.map((name) => [name, false])),
    };
    return config;
  },

  // React configuration
  reactStrictMode: true,

  // Compiler optimizations
  compiler: {
    removeConsole: isProduction,
  },
};

export default nextConfig;
