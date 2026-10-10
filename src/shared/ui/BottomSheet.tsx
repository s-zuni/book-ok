"use client";

import { useEffect, type ReactNode } from "react";

interface BottomSheetProps {
    open: boolean;
    onClose: () => void;
    /** 접근성용 제목(스크린리더) */
    label: string;
    children: ReactNode;
}

export default function BottomSheet({ open, onClose, label, children }: BottomSheetProps) {
    useEffect(() => {
        if (!open) return;
        const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", onKeyDown);
        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-100 flex items-end justify-center">
            <div className="absolute inset-0 bg-black/50 animate-in fade-in duration-200" onClick={onClose} aria-hidden />
            <div
                role="dialog"
                aria-modal="true"
                aria-label={label}
                className="relative w-full max-w-md max-h-[90dvh] overflow-y-auto bg-white rounded-t-[20px] px-5 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] animate-in slide-in-from-bottom duration-300"
            >
                <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-gray-200" aria-hidden />
                {children}
            </div>
        </div>
    );
}
