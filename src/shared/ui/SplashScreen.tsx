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
            {/* Full Screen Centered Splash Screen Image with custom bounce/fade animation */}
            <div className="absolute inset-0 flex items-center justify-center p-4 animate-splash-logo">
                <div className="relative w-full h-full max-w-md">
                    <Image
                        src="/images/splash.png"
                        alt="Book,ok Splash"
                        fill
                        className="object-contain"
                        priority
                    />
                </div>
            </div>
        </div>
    );
}
