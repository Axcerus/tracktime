import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/login",
        destination: "/",
      },
      {
        source: "/reports",
        destination: "/",
      },
      {
        source: "/profile",
        destination: "/",
      },
    ];
  },
};

export default nextConfig;
