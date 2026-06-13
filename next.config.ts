import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow dev assets (HMR + _next chunks) to load through tunnels / LAN while testing.
  allowedDevOrigins: ["*.trycloudflare.com", "*.loca.lt"],
};

export default nextConfig;
