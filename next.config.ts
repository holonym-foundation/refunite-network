import { type NextConfig } from "next";

const isMobileBuild = process.env.BUILD_TARGET === "mobile";
const isProduction = process.env.NODE_ENV === "production";

console.log("isMobileBuild", isMobileBuild);
console.log("isProduction", isProduction);

const nextConfig: NextConfig = {
  // Conditional output based on build target
  output: isMobileBuild ? "export" : undefined,
  distDir: isMobileBuild ? "out" : ".next",

  // Image configuration
  images: {
    domains: ["ipfs.io", "github.com"],
    unoptimized: isMobileBuild, // Required for static export
  },

  // Package transpilation
  transpilePackages: ["@refunite/ui", "ua-parser-js"],

  // React configuration
  reactStrictMode: true,

  // Mobile-specific optimizations
  experimental: isMobileBuild
    ? {
        // Enable static exports for mobile
        // Note: staticExports is handled by output: "export"
      }
    : undefined,

  // Compiler optimizations
  compiler: {
    removeConsole: isProduction,
  },
};

export default nextConfig;
