"use client";

import { useEffect, useState } from "react";
import { BookMarked } from "lucide-react";

// Helper function to check if splash was already shown (runs synchronously)
const getSplashInitialState = (): boolean => {
    if (typeof window === 'undefined') return false; // SSR: don't show
    if (window.innerWidth >= 1024) return false; // Desktop: don't show
    if (sessionStorage.getItem('splash_shown')) return false; // Already shown: don't show
    return true; // First mobile visit: show
};

export default function SplashScreen() {
    const [isVisible, setIsVisible] = useState(getSplashInitialState);
    const [opacity, setOpacity] = useState(1);

    useEffect(() => {
        // If not visible, nothing to do
        if (!isVisible) return;

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
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-green-600 animate-in zoom-in-95 duration-700">
                <BookMarked size={60} strokeWidth={1.5} />
            </div>

            {/* Bottom Text */}
            <div className="absolute bottom-20 left-0 right-0 text-center animate-in slide-in-from-bottom-5 duration-700 delay-100">
                <h1 className="text-lg font-black italic text-green-600 tracking-tight">
                    Book,ok
                </h1>
            </div>
        </div>
    );
}
