"use client";

import { Smile } from "lucide-react";

interface InterestPromptCardProps {
    childName: string;
    onStart: () => void;
    onLater: () => void;
}

export default function InterestPromptCard({ childName, onStart, onLater }: InterestPromptCardProps) {
    return (
        <div className="mx-4 mt-1 rounded-[10px] border border-[#16A34A]/60 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-50 text-[#16A34A]">
                    <Smile size={22} />
                </div>
                <div className="min-w-0">
                    <p className="text-[15px] font-bold text-[#2A2A2A] break-keep">{childName}의 관심사는 무엇인가요?</p>
                    <p className="mt-0.5 text-[11px] font-medium text-gray-500 break-keep">좋아하는 주제 2-3개만 알려주시면 바로 추천해 드려요</p>
                </div>
            </div>
            <button
                type="button"
                onClick={onStart}
                className="mt-3 h-10 w-full rounded-[4px] bg-[#16A34A] text-[13px] font-bold text-white active:scale-[0.99] transition-transform"
            >
                관심사 설정하고 추천받기
            </button>
            <button type="button" onClick={onLater} className="mt-2 block w-full text-center text-[11px] font-medium text-gray-500 underline underline-offset-2">
                나중에 설정할게요
            </button>
        </div>
    );
}
