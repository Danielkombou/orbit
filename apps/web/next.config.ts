import type { NextConfig } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/auth/:path*",
        destination: `${API_URL}/api/auth/:path*`,
      },
      {
        source: "/api/chat/:path*",
        destination: `${API_URL}/api/chat/:path*`,
      },
      {
        source: "/api/settings/:path*",
        destination: `${API_URL}/api/settings/:path*`,
      },
      {
        source: "/api/activity/:path*",
        destination: `${API_URL}/api/activity/:path*`,
      },
      {
        source: "/api/tasks/:path*",
        destination: `${API_URL}/api/tasks/:path*`,
      },
      {
        source: "/api/transcribe",
        destination: `${API_URL}/api/transcribe`,
      },
      {
        source: "/api/tts",
        destination: `${API_URL}/api/tts`,
      },
      {
        source: "/api/ai/autopilot",
        destination: `${API_URL}/api/ai/autopilot`,
      },
      {
        source: "/api/ai/stream",
        destination: `${API_URL}/api/ai/stream`,
      },
    ];
  },
};

export default nextConfig;
