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
    unoptimized: isCapacitorBuild,
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

// ──────────────────────────────────────────────
// 빌드 타겟별 최종 설정
// ──────────────────────────────────────────────
const nextConfig: NextConfig = isCapacitorBuild
  ? {
      // ── Capacitor (Static Export) ──────────
      ...baseConfig,
      output: 'export',
      // headers/rewrites 함수를 아예 정의하지 않아 경고 방지
    }
  : {
      // ── Web (Vercel SSR/ISR) ──────────────
      ...baseConfig,



      // Supabase 프록시 리라이트
      async rewrites() {
        return [
          {
            source: "/supabase/:path*",
            destination: `${SUPABASE_URL}/:path*`,
          },
        ];
      },

      // 모바일 네이티브 앱(Capacitor) 통신 허용을 위한 글로벌 CORS 헤더 설정
      async headers() {
        return [
          {
            source: "/api/:path*",
            headers: [
              { key: "Access-Control-Allow-Credentials", value: "true" },
              { key: "Access-Control-Allow-Origin", value: "*" },
              { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
              { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" },
            ],
          },
        ];
      },
    };

export default nextConfig;
