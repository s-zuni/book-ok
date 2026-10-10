"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "bookok_librarian_tooltip_seen";
const AUTO_HIDE_MS = 6000;

/** 하단 네비 중앙 AI 사서 버튼 위에 한 번만 보여주는 안내 말풍선. 부모는 `relative`/`fixed` 컨테이너여야 합니다. */
export default function LibrarianTooltip() {
    const [visible, setVisible] = useState(false);

    const dismiss = () => {
        setVisible(false);
        try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* 무시 */ }
    };

    useEffect(() => {
        try {
            if (localStorage.getItem(STORAGE_KEY) === "1") return;
        } catch {
            return; // 저장소를 못 쓰는 환경에서는 매번 뜨지 않도록 표시하지 않음
        }
        setVisible(true);
        const timer = setTimeout(() => dismiss(), AUTO_HIDE_MS);
        return () => clearTimeout(timer);
    }, []);

    if (!visible) return null;

    return (
        <div className="absolute bottom-full left-0 right-0 mb-[22px] px-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <button
                type="button"
                onClick={dismiss}
                className="relative flex w-full items-center gap-[9px] rounded-[10px] bg-[#1A1A1A]/[0.86] p-4 text-left"
            >
                <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-[#16A34A] text-[13px] font-bold text-white" aria-hidden>✦</span>
                <span className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-[#9CFF88]">AI 독서코치</span>
                    <span className="text-[14px] text-white break-keep">구체적인 질문과 고민은 AI 사서에게 물어보세요!</span>
                </span>
                <span className="absolute left-1/2 top-full h-[8px] w-[16px] -translate-x-1/2 bg-[#1A1A1A]/[0.86] [clip-path:polygon(0_0,100%_0,50%_100%)]" aria-hidden />
            </button>
        </div>
    );
}
