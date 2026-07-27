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

        // Immediately hide if native platform, on desktop, or already shown
        if (Capacitor.isNativePlatform() || (typeof window !== 'undefined' && (window.innerWidth >= 1024 || isSplashShown))) {
            setIsVisible(false);
            return;
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
