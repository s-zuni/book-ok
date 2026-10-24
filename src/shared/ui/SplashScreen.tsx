"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Capacitor } from "@capacitor/core";
import { SplashScreen as NativeSplashScreen } from "@capacitor/splash-screen";

export default function SplashScreen() {
    // SSR and initial client hydration must match, so default to true.
    const [isVisible, setIsVisible] = useState(true);
    const [opacity, setOpacity] = useState(1);

    useEffect(() => {
        // Hide native splash screen as soon as React mounts
        if (Capacitor.isNativePlatform()) {
            NativeSplashScreen.hide().catch(() => {});
        }
    }, []);

    useEffect(() => {
        let isSplashShown = false;
        try {
            if (typeof window !== 'undefined') {
                isSplashShown = !!sessionStorage.getItem('splash_shown');
            }
        } catch (e) {
            console.warn("Failed to access sessionStorage:", e);
        }

        // Immediately hide if on desktop, or already shown (for web)
        if (typeof window !== 'undefined' && (window.innerWidth >= 1024 || isSplashShown)) {
            // Use setTimeout to avoid synchronous setState inside render/effect phase
            const timer = setTimeout(() => {
                setIsVisible(false);
            }, 0);
            return () => clearTimeout(timer);
        }

        // Mark as shown
        try {
            if (typeof window !== 'undefined') {
                sessionStorage.setItem('splash_shown', 'true');
            }
        } catch (e) {
            console.warn("Failed to set sessionStorage:", e);
        }

        // Keep visible for 1.5 seconds, then fade out
        const fadeTimer = setTimeout(() => {
            setOpacity(0);
        }, 1500);

        // Remove from DOM after transition (1.5s + 500ms transition)
        const removeTimer = setTimeout(() => {
            setIsVisible(false);
        }, 2000);

        return () => {
            clearTimeout(fadeTimer);
            clearTimeout(removeTimer);
        };
    }, []); // Only run once on mount to avoid dependency loop and state updates during updates

    if (!isVisible) return null;

    // Figma splash_screen(1284×2778) 기준: 흰 배경 중앙에 로고 마크 + 초록색 '북콕', 하단에 슬로건.
    // 가로는 vw 비율(디자인 폭 1284px 기준)로 맞추고, 큰 화면에서는 상한을 둔다.
    return (
        <div
            className="fixed inset-0 bg-white transition-opacity duration-500 ease-in-out lg:hidden"
            style={{ opacity, zIndex: 9999 }}
        >
            <div className="absolute inset-0 flex items-center justify-center animate-splash-logo">
                <div className="flex items-center gap-[1vw]">
                    {/* Figma 로고 마크(배경 투명 PNG) */}
                    <Image
                        src="/images/splash_logo.png"
                        alt=""
                        width={1024}
                        height={1024}
                        priority
                        className="w-[min(37.7vw,200px)] h-auto"
                    />
                    <span className="text-[#01C54F] font-extrabold leading-none text-[min(9.35vw,48px)]">북콕</span>
                </div>
            </div>
            <p
                className="absolute inset-x-0 text-center font-bold text-[#8F8F8F] text-[clamp(13px,3.74vw,18px)]"
                style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 5vh)" }}
            >
                우리 아이 평생 독서의 시작
            </p>
        </div>
    );
}
