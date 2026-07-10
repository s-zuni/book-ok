"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export default function SplashScreen() {
    // SSR and initial client hydration must match, so default to true.
    const [isVisible, setIsVisible] = useState(true);
    const [opacity, setOpacity] = useState(1);

    useEffect(() => {
        // Immediately hide if on desktop or already shown
        if (typeof window !== 'undefined' && (window.innerWidth >= 1024 || sessionStorage.getItem('splash_shown'))) {
            const timer = setTimeout(() => setIsVisible(false), 0);
            return () => clearTimeout(timer);
        }

        // Mark as shown
        sessionStorage.setItem('splash_shown', 'true');

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
    }, [isVisible]);

    if (!isVisible) return null;

    return (
        <div
            className="fixed inset-0 bg-white transition-opacity duration-500 ease-in-out lg:hidden"
            style={{ opacity, zIndex: 9999 }}
        >
            {/* Centered Logo */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-in zoom-in-95 duration-700 w-24 h-24 bg-white border border-gray-100 rounded-3xl p-4.5 flex items-center justify-center shadow-lg">
                <div className="relative w-full h-full">
                    <Image
                        src="/images/logo_transparent_v2.png"
                        alt="Book,ok Logo"
                        fill
                        className="object-contain"
                        sizes="96px"
                        priority
                    />
                </div>
            </div>

            {/* Bottom Text */}
            <div className="absolute bottom-20 left-0 right-0 text-center animate-in slide-in-from-bottom-5 duration-700 delay-100">
                <h1 className="text-xl font-extrabold text-[#101828] tracking-tight">
                    Book,ok
                </h1>
            </div>
        </div>
    );
}
