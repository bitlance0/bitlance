import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.benzinga.com",
      },
      {
        protocol: "https",
        hostname: "cdn.snapi.dev",
      },
      {
        protocol: "https",
        hostname: "cdn.i-scmp.com",
      },
      {
        protocol: "https",
        hostname: "cdn.benzinga.com",
      },
      {
        protocol: "https",
        hostname: "s3.cointelegraph.com",
      },
      {
        protocol: "https",
        hostname: "img.i-scmp.com",
      },
      {
        protocol: "https",
        hostname: "static.alphavantage.co",
      },
      {
        protocol: "https",
        hostname: "g.foolcdn.com",
      },
    ],
  },
};

export default nextConfig;
