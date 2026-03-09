import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  // Allow Slack avatar images
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.slack-edge.com",
      },
      {
        protocol: "https",
        hostname: "avatars.slack-edge.com",
      },
      {
        protocol: "https",
        hostname: "secure.gravatar.com",
      },
    ],
  },
  // Needed for better-sqlite3 native module
  serverExternalPackages: ["better-sqlite3", "puppeteer-core"],
};

export default nextConfig;
