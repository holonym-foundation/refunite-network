import { type NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

console.log("isProduction", isProduction);

const nextConfig: NextConfig = {
  // Image configuration
  images: {
    domains: ["ipfs.io", "github.com"],
  },

  // Package transpilation
  transpilePackages: ["@refunite/ui", "ua-parser-js"],

  // React configuration
  reactStrictMode: true,

  // Compiler optimizations
  compiler: {
    removeConsole: isProduction,
  },
};

export default nextConfig;
