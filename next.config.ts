import type { NextConfig } from "next";

/**
 * 환경 변수 기반 웹/앱 빌드 분기.
 *
 * - `npm run build:web`  → BUILD_TARGET 미설정 → Vercel SSR/ISR 모드
 * - `npm run build:app`  → BUILD_TARGET=capacitor → Static Export 모드
 */
const isCapacitorBuild = process.env.BUILD_TARGET === 'capacitor';

const SUPABASE_URL =
  process.env.NEXT_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "https://holaqlorkluptvrcfwtu.supabase.co";



// ──────────────────────────────────────────────
// 공통 설정 (웹/앱 모두 적용)
// ──────────────────────────────────────────────
const baseConfig: NextConfig = {
  trailingSlash: true,
  typescript: {
    ignoreBuildErrors: false,
  },
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

const nextConfig: NextConfig = {
  ...baseConfig,
  ...(isCapacitorBuild ? { output: 'export' } : {}),
};

export default nextConfig;
