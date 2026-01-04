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

export const metadata: Metadata = {
  title: "Book,ok - 우리 아이 맞춤 독서 플랫폼",
  description: "Book,ok",
};

import { AuthProvider } from "../context/AuthContext";
import MobileBottomNav from "../components/MobileBottomNav";
import SplashScreen from "../components/SplashScreen";

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
          <SplashScreen />
          {children}
          <div className="lg:hidden">
            <MobileBottomNav />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
