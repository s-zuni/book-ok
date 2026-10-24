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

        // 등장 애니메이션이 끝난 뒤 잠시 보여 주고(2.2초) 페이드 아웃
        const fadeTimer = setTimeout(() => {
            setOpacity(0);
        }, 2200);

        // 페이드(0.5초)가 끝나면 DOM에서 제거
        const removeTimer = setTimeout(() => {
            setIsVisible(false);
        }, 2700);

        return () => {
            clearTimeout(fadeTimer);
            clearTimeout(removeTimer);
        };
    }, []); // Only run once on mount to avoid dependency loop and state updates during updates

    if (!isVisible) return null;

    // 크림색 배경(캐릭터 이미지 가장자리 색과 같아 이음매 없이 이어짐) 위에
    // 캐릭터 → 로고 락업(마크+북콕) → 슬로건 → 로딩 점. 크기는 디자인 폭 1284px 기준 vw 비율이며 큰 화면에서는 상한을 둔다.
    return (
        <div
            role="status"
            aria-label="북콕을 불러오는 중"
            className="fixed inset-0 transition-opacity duration-500 ease-in-out lg:hidden overflow-hidden"
            style={{ opacity, zIndex: 9999, backgroundColor: "#F3EEE2" }}
        >
            <div className="absolute inset-0 flex flex-col items-center justify-center pb-[6vh]">
                {/* 캐릭터: 가장자리를 부드럽게 섞어 배경과 하나로 보이게 한다 */}
                <div className="splash-char-in relative w-[min(88vw,420px)] aspect-square">
                    <div className="splash-float absolute inset-0">
                        <Image
                            src="/images/splash_character.webp"
                            alt=""
                            width={840}
                            height={840}
                            priority
                            className="w-full h-full"
                            style={{
                                WebkitMaskImage: "radial-gradient(closest-side, #000 78%, transparent 100%)",
                                maskImage: "radial-gradient(closest-side, #000 78%, transparent 100%)",
                            }}
                        />
                    </div>
                    <Sparkle className="splash-twinkle absolute left-[8%] top-[22%] w-[7%] text-[#FACC15]" />
                    <Sparkle className="splash-twinkle absolute right-[10%] top-[12%] w-[10%] text-[#FACC15]" delay="400ms" />
                    <Sparkle className="splash-twinkle absolute right-[6%] top-[46%] w-[5%] text-[#16A34A]" delay="900ms" />
                </div>

                {/* 로고 락업 */}
                <div className="splash-rise-1 -mt-[9vw] flex items-center gap-[1.5vw]">
                    <Image
                        src="/images/splash_logo.png"
                        alt=""
                        width={1024}
                        height={1024}
                        priority
                        className="w-[min(25vw,120px)] h-auto"
                    />
                    <span className="font-extrabold leading-none text-[#01C54F] text-[min(8.6vw,42px)]">북콕</span>
                </div>

                <p className="splash-rise-2 mt-[2.2vh] font-bold text-[#6B7280] text-[clamp(13px,3.9vw,17px)]">
                    우리 아이 평생 독서의 시작
                </p>
            </div>

            {/* 로딩 점 */}
            <div
                className="absolute inset-x-0 flex justify-center gap-2"
                style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 5vh)" }}
                aria-hidden="true"
            >
                {[0, 1, 2].map((i) => (
                    <span
                        key={i}
                        className="splash-dot block w-2 h-2 rounded-full bg-[#16A34A]"
                        style={{ animationDelay: `${i * 160}ms` }}
                    />
                ))}
            </div>
        </div>
    );
}

/** 네 갈래 반짝이 (포인트 컬러) */
function Sparkle({ className, delay }: { className: string; delay?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className={className}
            style={delay ? { animationDelay: delay } : undefined}
            aria-hidden="true"
        >
            <path d="M12 0C12.8 7 17 11.2 24 12C17 12.8 12.8 17 12 24C11.2 17 7 12.8 0 12C7 11.2 11.2 7 12 0Z" />
        </svg>
    );
}
