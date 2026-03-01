import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { Toaster } from "sonner"; // Import Toaster

export const metadata: Metadata = {
  title: "Book,ok | 우리 아이 맞춤 독서 플랫폼",
  description: "AI 기반 독서 성향 분석과 연령별 맞춤 도서 추천으로 우리 아이 독서 습관을 길러주세요.",
  viewport: {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
  },
  openGraph: {
    title: "Book,ok - 우리 아이 맞춤 독서 플랫폼",
    description: "AI 독서 성향 분석 & 맞춤 도서 추천",
    type: "website",
    locale: "ko_KR",
    siteName: "Book,ok",
  },
  twitter: {
    card: "summary_large_image",
    title: "Book,ok | 우리 아이 독서 친구",
    description: "AI 분석으로 완성하는 우리 아이 독서 로드맵"
  }
};

import { AuthProvider } from "../context/AuthContext";
import { ChatbotProvider } from "../context/ChatbotContext"; // Import Context
import MobileBottomNav from "../components/MobileBottomNav";
import SplashScreen from "../components/SplashScreen";
import AIChatbot from "../components/AIChatbot"; // Import Chatbot

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased pb-16 lg:pb-0`}
      >
        <AuthProvider>
          <ChatbotProvider>
            <Toaster position="top-center" richColors closeButton />
            <SplashScreen />
            {children}
            <AIChatbot /> {/* Global Chatbot Component */}
            <div className="lg:hidden">
              <MobileBottomNav />
            </div>
          </ChatbotProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
