import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@provenant/core"],
  poweredByHeader: false,
};

export default nextConfig;
