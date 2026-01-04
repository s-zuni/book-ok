"use client";

import { useEffect, useState } from "react";
import { BookMarked } from "lucide-react";

export default function SplashScreen() {
    const [isVisible, setIsVisible] = useState(true);
    const [opacity, setOpacity] = useState(1);

    useEffect(() => {
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
    }, []);

    if (!isVisible) return null;

    return (
        <div
            className="fixed inset-0 bg-white transition-opacity duration-500 ease-in-out"
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
