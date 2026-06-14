import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow dev assets (HMR + _next chunks) to load through tunnels / LAN while testing.
  allowedDevOrigins: ["*.trycloudflare.com", "*.loca.lt"],
  async headers() {
    return [
      {
        // Service workers must not be cached, or devices keep stale push logic.
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
