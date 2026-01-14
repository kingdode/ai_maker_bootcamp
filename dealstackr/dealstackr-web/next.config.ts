import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: "standalone",
  
  // Enable experimental features if needed
  experimental: {
    // serverActions: true, // Already enabled by default in Next.js 14+
  },
};

export default nextConfig;
