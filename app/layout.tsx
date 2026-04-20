import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Pretendard: self-hosted for Vercel build reliability
const pretendard = localFont({
  src: [
    { path: "../public/fonts/Pretendard-Regular.subset.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/Pretendard-Medium.subset.woff2", weight: "500", style: "normal" },
    { path: "../public/fonts/Pretendard-SemiBold.subset.woff2", weight: "600", style: "normal" },
    { path: "../public/fonts/Pretendard-Bold.subset.woff2", weight: "700", style: "normal" },
    { path: "../public/fonts/Pretendard-ExtraBold.subset.woff2", weight: "800", style: "normal" },
    { path: "../public/fonts/Pretendard-Black.subset.woff2", weight: "900", style: "normal" },
  ],
  variable: "--font-pretendard",
  display: "swap",
  fallback: ["-apple-system", "BlinkMacSystemFont", "system-ui", "sans-serif"],
});

import { Toaster } from "sonner";
import Script from "next/script";

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Book,ok | 우리 아이 맞춤 독서 플랫폼",
  description:
    "AI 기반 독서 성향 분석과 연령별 맞춤 도서 추천으로 우리 아이 독서 습관을 길러주세요.",
  openGraph: {
    title: "Book,ok - 우리 아이 맞춤 독서 플랫폼",
    description: "AI 독서 성향 분석 & 맞춤 도서 추천",
    type: "website",
    locale: "ko_KR",
    siteName: "Book,ok",
  },
};

import { AuthProvider } from "@features/auth/AuthContext";
import { ChatbotProvider } from "@widgets/chatbot/ChatbotContext";
import { LoginModalProvider } from "@features/auth/LoginModalContext";
import MobileBottomNav from "@shared/ui/MobileBottomNav";
import SplashScreen from "@shared/ui/SplashScreen";
import AIChatbot from "@widgets/chatbot/AIChatbot";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        {/* Pretendard CDN fallback */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        {/* Inject Supabase Anon Key safely before other scripts load */}
        <Script
          id="supabase-env"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `window._SUPABASE_ANON_KEY = "${process.env.NEXT_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}";`,
          }}
        />
      </head>
      <body
        className={`${pretendard.variable} antialiased pb-16 lg:pb-0`}
        style={{
          fontFamily:
            "var(--font-pretendard), 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
        }}
      >
        <AuthProvider>
          <LoginModalProvider>
            <ChatbotProvider>
              <Toaster position="top-center" richColors closeButton />
              <SplashScreen />
              {children}
              <AIChatbot />
              <div className="lg:hidden">
                <MobileBottomNav />
              </div>
            </ChatbotProvider>
          </LoginModalProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
