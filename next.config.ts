import { type NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ["ipfs.io", "github.com"],
    unoptimized: true,
  },
  transpilePackages: ["@refunite/ui", "ua-parser-js"],
  reactStrictMode: true,
};

export default nextConfig;
