import type { NextConfig } from "next";

const SUPABASE_URL =
  process.env.NEXT_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "https://holaqlorkluptvrcfwtu.supabase.co";

const nextConfig: NextConfig = {
  output: process.env.BUILD_TARGET === 'capacitor' || process.env.NODE_ENV === 'production' ? 'export' : undefined,
  trailingSlash: true,
  turbopack: undefined,
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "image.aladin.co.kr" },
      { protocol: "https", hostname: "covers.openlibrary.org" },
      { protocol: "https", hostname: "books.google.com" },
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
};

export default nextConfig;
