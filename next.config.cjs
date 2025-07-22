/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["ipfs.io", "github.com"],
    unoptimized: true,
  },
  transpilePackages: ["@refunite/ui"],
  reactStrictMode: true,
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
};

module.exports = nextConfig;
