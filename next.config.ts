import type { NextConfig } from "next";

const SUPABASE_URL =
  process.env.NEXT_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tffvsyarxfujmvbqlutr.supabase.co";

const nextConfig: NextConfig = {
  // Use webpack bundler — avoids Turbopack RangeError: Invalid count value: -1 bug
  turbopack: undefined,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "image.aladin.co.kr" },
      { protocol: "https", hostname: "covers.openlibrary.org" },
      { protocol: "https", hostname: "books.google.com" },
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,DELETE,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      // Supabase REST API proxy — resolves domain-level CORS on Vercel
      {
        source: "/supabase/:path*",
        destination: `${SUPABASE_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
