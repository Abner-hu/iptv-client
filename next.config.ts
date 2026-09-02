import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cursor preview and the desktop browser both hit 127.0.0.1:43217.
  // Next.js 16 blocks cross-origin /_next/* in dev unless listed here.
  allowedDevOrigins: ["127.0.0.1", "localhost", "0.0.0.0"],
};

export default nextConfig;
