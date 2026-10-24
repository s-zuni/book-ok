"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Eye, EyeOff, Sparkles } from "lucide-react";
import { LiteracyPassage, LiteracyQuestion } from "@shared/types";
import { AREA_METADATA } from "@features/literacy/scoring";
import { UNSURE_OPTION } from "@features/literacy/useLiteracyTest";

interface LiteracyQuizStepProps {
    passage: LiteracyPassage;
    question: LiteracyQuestion;
    questionIndex: number;
    questionCount: number;
    selected: number | undefined;
    onSelect: (questionId: string, optionIdx: number) => void;
    onMove: (delta: number) => void;
    onSubmit: () => void;
}

export default function LiteracyQuizStep({
    passage,
    question,
    questionIndex,
    questionCount,
    selected,
    onSelect,
    onMove,
    onSubmit,
}: LiteracyQuizStepProps) {
    const [showPassage, setShowPassage] = useState(false);
    const isLast = questionIndex === questionCount - 1;
    const answered = typeof selected === "number";
    const area = AREA_METADATA[question.area];

    const optionClass = (isSelected: boolean) =>
        `w-full p-4 sm:p-5 rounded-2xl border text-left transition-all flex items-start gap-3 active:scale-[0.99] ${
            isSelected
                ? "bg-[#E8F5E9] border-[#16A34A] text-[#1A1A1A] shadow-xs ring-2 ring-[#16A34A]/20"
                : "bg-[#F9FAFB] hover:bg-gray-100/80 border-gray-100 text-gray-800"
        }`;

    return (
        <div className="space-y-5 animate-in fade-in duration-300">
            <div
                className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden"
                role="progressbar"
                aria-valuemin={1}
                aria-valuemax={questionCount}
                aria-valuenow={questionIndex + 1}
            >
                <div
                    className="bg-[#16A34A] h-full rounded-full transition-all duration-300"
                    style={{ width: `${((questionIndex + 1) / questionCount) * 100}%` }}
                />
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs overflow-hidden">
                <button
                    type="button"
                    onClick={() => setShowPassage((v) => !v)}
                    aria-expanded={showPassage}
                    className="w-full px-4 py-3 flex items-center justify-between text-xs font-extrabold text-[#2E5A44] bg-emerald-50/50 hover:bg-emerald-50 transition-colors"
                >
                    <span className="flex items-center gap-1.5">
                        {showPassage ? <EyeOff size={15} /> : <Eye size={15} />}
                        📖 지문 다시 보기 ({passage.title})
                    </span>
                    <span className="text-xs font-bold text-[#16A34A]">{showPassage ? "접기 ▲" : "펼쳐서 확인하기 ▼"}</span>
                </button>
                {showPassage && (
                    <div className="p-5 bg-white border-t border-gray-100 max-h-60 overflow-y-auto text-sm text-gray-700 leading-relaxed break-keep whitespace-pre-line">
                        {passage.content}
                    </div>
                )}
            </div>

            <div className="bg-white rounded-[32px] border border-gray-100 p-6 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-6">
                <div>
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span
                            className={`text-xs font-extrabold px-3 py-1 rounded-full border ${
                                area?.badgeColor || "bg-emerald-50 text-emerald-700 border-emerald-200"
                            }`}
                        >
                            {area?.label || question.area}
                        </span>
                        <span className="text-xs font-bold text-gray-500">{area?.description}</span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-black text-[#1A1A1A] leading-snug break-keep">
                        Q{questionIndex + 1}. {question.question}
                    </h2>
                </div>

                <div className="space-y-3" role="radiogroup" aria-label={`문항 ${questionIndex + 1} 보기`}>
                    {question.options.map((opt, oIdx) => {
                        const isSelected = selected === oIdx;
                        return (
                            <button
                                key={oIdx}
                                type="button"
                                role="radio"
                                aria-checked={isSelected}
                                onClick={() => onSelect(question.id, oIdx)}
                                className={optionClass(isSelected)}
                            >
                                <span
                                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5 ${
                                        isSelected ? "bg-[#16A34A] text-white" : "bg-white border border-gray-200 text-gray-500"
                                    }`}
                                >
                                    {oIdx + 1}
                                </span>
                                <span className="text-sm sm:text-base font-bold leading-relaxed break-keep flex-1">{opt}</span>
                            </button>
                        );
                    })}

                    {/* 찍지 않고 솔직하게 모른다고 표시할 수 있게 한다 (오답으로 채점되지만 기록은 구분됨) */}
                    <button
                        type="button"
                        role="radio"
                        aria-checked={selected === UNSURE_OPTION}
                        onClick={() => onSelect(question.id, UNSURE_OPTION)}
                        className={`${optionClass(selected === UNSURE_OPTION)} !p-3 sm:!p-4 border-dashed`}
                    >
                        <span className="text-sm font-bold text-gray-600 flex-1 text-center">🤔 잘 모르겠어요</span>
                    </button>
                </div>

                <div className="flex items-center justify-between gap-3 pt-4 border-t border-gray-100">
                    <button
                        type="button"
                        disabled={questionIndex === 0}
                        onClick={() => onMove(-1)}
                        className="px-5 py-3.5 rounded-2xl border border-gray-200 text-xs sm:text-sm font-extrabold text-gray-600 disabled:opacity-40 flex items-center gap-1 hover:bg-gray-50 transition-colors"
                    >
                        <ChevronLeft size={16} /> 이전 문항
                    </button>

                    {!isLast ? (
                        <button
                            type="button"
                            disabled={!answered}
                            onClick={() => onMove(1)}
                            className="flex-1 sm:flex-initial px-7 py-3.5 rounded-2xl bg-[#2E5A44] hover:bg-[#1E3F2F] disabled:bg-gray-200 disabled:text-gray-500 text-white text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1 shadow-sm"
                        >
                            다음 문항 <ChevronRight size={16} />
                        </button>
                    ) : (
                        <button
                            type="button"
                            disabled={!answered}
                            onClick={onSubmit}
                            className="flex-1 sm:flex-initial px-7 py-3.5 rounded-2xl bg-[#16A34A] hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-500 text-white text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 shadow-md"
                        >
                            <Sparkles size={16} />
                            결과 보기
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
