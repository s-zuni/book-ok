"use client";

import { useState } from "react";
import { BookOpen, CheckCircle2, ShieldCheck, Type } from "lucide-react";
import { LiteracyPassage } from "@shared/types";
import { GradeLevelConfig } from "@features/literacy/scoring";

const LARGE_FONT_KEY = "bookok_literacy_large_font";

interface LiteracyPassageStepProps {
    passage: LiteracyPassage;
    gradeConfig: GradeLevelConfig;
    readingTimeLabel: string;
    onFinish: () => void;
}

export default function LiteracyPassageStep({ passage, gradeConfig, readingTimeLabel, onFinish }: LiteracyPassageStepProps) {
    // 큰 글자 설정 기억 (이 컴포넌트는 지문을 받은 뒤 클라이언트에서만 마운트된다)
    const [largeFont, setLargeFont] = useState<boolean>(() => {
        try {
            return localStorage.getItem(LARGE_FONT_KEY) === "1";
        } catch {
            return false;
        }
    });

    const toggleLargeFont = () => {
        setLargeFont((prev) => {
            try {
                localStorage.setItem(LARGE_FONT_KEY, prev ? "0" : "1");
            } catch {
                // ignore
            }
            return !prev;
        });
    };

    return (
        <div className="space-y-5 animate-in fade-in duration-300">
            <div className="bg-emerald-50/80 border border-emerald-100 rounded-2xl p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#2E5A44] text-white flex items-center justify-center shrink-0">
                        <BookOpen size={18} />
                    </div>
                    <div>
                        <p className="text-xs lg:text-sm font-extrabold text-[#2E5A44]">
                            {gradeConfig.isParentGuided
                                ? "👨‍👩‍👧 부모님과 함께 소리 내어 읽으며 내용을 떠올려 보세요!"
                                : "📖 내용을 생각하며 끝까지 차분하게 읽어 보세요!"}
                        </p>
                        <p className="text-xs text-emerald-800/80 font-medium">
                            {gradeConfig.isParentGuided
                                ? "다 읽은 뒤 [다 읽었어요] 버튼을 눌러 주세요."
                                : "다 읽은 뒤 [다 읽었어요] 버튼을 누르면 읽은 시간이 참고용으로 기록돼요."}
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={toggleLargeFont}
                    aria-pressed={largeFont}
                    className="shrink-0 bg-white border border-emerald-200 text-[#2E5A44] px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1 hover:bg-emerald-50 transition-colors"
                >
                    <Type size={14} />
                    {largeFont ? "기본 글자" : "큰 글자"}
                </button>
            </div>

            <article className="bg-white rounded-[32px] border border-gray-100 p-6 sm:p-10 shadow-[0_4px_24px_rgba(0,0,0,0.03)]">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="bg-[#2E5A44] text-white text-xs font-extrabold px-3 py-1 rounded-full">{passage.genre}</span>
                    <span className="bg-gray-100 text-gray-600 text-xs font-bold px-3 py-1 rounded-full">총 {passage.word_count}어절</span>
                </div>

                <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-[#1A1A1A] tracking-tight mb-6 pb-4 border-b border-gray-100 break-keep">
                    {passage.title}
                </h1>

                <div
                    className={`${
                        largeFont ? "text-lg sm:text-xl leading-[2.0]" : "text-base sm:text-lg leading-[1.9]"
                    } font-medium text-[#1A1A1A] break-keep whitespace-pre-line tracking-tight`}
                >
                    {passage.content}
                </div>

                {passage.key_vocabularies && passage.key_vocabularies.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-gray-100">
                        <div className="flex items-center gap-1.5 text-xs font-black text-[#2E5A44] mb-3">
                            <ShieldCheck size={15} className="text-[#16A34A]" />
                            핵심 어휘 힌트
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            {passage.key_vocabularies.map((v) => (
                                <div key={v.word} className="bg-[#F9FAFB] rounded-2xl p-3 border border-gray-100">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-black text-[#2E5A44]">{v.word}</span>
                                        <span className="text-xs font-bold text-gray-500">{v.level}</span>
                                    </div>
                                    <p className="text-xs text-gray-600 font-medium leading-snug break-keep">{v.meaning}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <p className="mt-4 text-xs font-semibold text-gray-500 text-right">Book,ok 제작 지문</p>
            </article>

            <button
                type="button"
                onClick={onFinish}
                className="w-full bg-[#16A34A] hover:bg-green-700 text-white font-black py-5 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-base sm:text-lg active:scale-[0.99]"
            >
                <CheckCircle2 size={20} />
                다 읽었어요! 문제 풀러 가기 ({readingTimeLabel})
            </button>
        </div>
    );
}
