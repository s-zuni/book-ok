"use client";

import { Check, ChevronRight, Flame, Sparkles, Star, X } from "lucide-react";
import { LiteracyQuestion, LiteracyWordType } from "@shared/types";
import type { LiteracyWordCheckResult } from "@features/literacy/api";

interface WordStats {
    combo: number;
    best: number;
    correct: number;
    answered: number;
}

interface LiteracyWordQuizStepProps {
    questions: LiteracyQuestion[];
    results: Record<string, LiteracyWordCheckResult>;
    index: number;
    pendingId: string | null;
    stats: WordStats;
    onAnswer: (question: LiteracyQuestion, optionIdx: number) => void;
    onNext: () => void;
    onDone: () => void;
}

const TYPE_META: Record<LiteracyWordType, { emoji: string; label: string; hint: string }> = {
    cloze: { emoji: "✏️", label: "빈칸 채우기", hint: "빈칸에 어울리는 낱말을 골라요" },
    synonym: { emoji: "🤝", label: "비슷한말 찾기", hint: "뜻이 비슷한 낱말을 골라요" },
    antonym: { emoji: "↔️", label: "반대말 찾기", hint: "뜻이 반대인 낱말을 골라요" },
    meaning: { emoji: "🔍", label: "뜻 맞히기", hint: "낱말의 뜻을 알아맞혀요" },
    spelling: { emoji: "✅", label: "맞춤법 찾기", hint: "바르게 쓴 것을 골라요" },
    odd_one_out: { emoji: "🧩", label: "다른 낱말 찾기", hint: "나머지와 어울리지 않는 낱말을 골라요" },
};

const RIGHT_CHEERS = ["정답이에요! 🎉", "맞았어요! 👏", "대단해요! ⭐", "척척이네요! 😎", "잘 알고 있어요! 🌟"];
const WRONG_CHEERS = ["아깝네요! 같이 알아봐요 💪", "괜찮아요, 이렇게 외워 봐요 🌱", "다음엔 맞힐 수 있어요! 🍀"];

/** 결과 문구: 낱말 퀴즈 결과를 점수·수준으로 단정하지 않고 격려만 한다 */
function summaryMessage(correct: number, total: number): { emoji: string; text: string } {
    const ratio = total === 0 ? 0 : correct / total;
    if (ratio === 1) return { emoji: "🏆", text: "모든 낱말을 맞혔어요! 낱말 박사예요." };
    if (ratio >= 0.67) return { emoji: "🎉", text: "낱말을 아주 잘 알고 있어요!" };
    if (ratio >= 0.34) return { emoji: "🌟", text: "잘했어요! 새로 알게 된 낱말이 생겼네요." };
    return { emoji: "🌱", text: "오늘 새 낱말을 많이 만났어요. 천천히 익혀 봐요." };
}

export default function LiteracyWordQuizStep({
    questions,
    results,
    index,
    pendingId,
    stats,
    onAnswer,
    onNext,
    onDone,
}: LiteracyWordQuizStepProps) {
    const total = questions.length;

    // 마지막 문항까지 끝나면 요약 화면
    if (index >= total) {
        const msg = summaryMessage(stats.correct, total);
        return (
            <div className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-[0_4px_24px_rgba(0,0,0,0.03)] text-center space-y-5 animate-in zoom-in-95 duration-300">
                <div className="text-6xl" aria-hidden="true">
                    {msg.emoji}
                </div>
                <h2 className="text-xl font-black text-[#1A1A1A]">낱말 퀴즈 끝!</h2>
                <div className="flex justify-center gap-1.5" aria-label={`${total}문제 중 ${stats.correct}문제 정답`}>
                    {questions.map((q) => (
                        <Star
                            key={q.id}
                            size={30}
                            className={results[q.id]?.is_correct ? "text-[#FACC15] fill-[#FACC15]" : "text-gray-200"}
                        />
                    ))}
                </div>
                <p className="text-sm font-bold text-gray-700">
                    {total}문제 중 <span className="text-[#16A34A] font-black">{stats.correct}문제</span>를 맞혔어요
                    {stats.best >= 2 && (
                        <>
                            <br />
                            <span className="inline-flex items-center gap-1 text-orange-600 font-black mt-1">
                                <Flame size={14} /> 최고 {stats.best}연속 정답!
                            </span>
                        </>
                    )}
                </p>
                <p className="text-sm text-gray-600 font-medium">{msg.text}</p>
                <button
                    type="button"
                    onClick={onDone}
                    className="w-full py-4 rounded-2xl bg-[#16A34A] hover:bg-green-700 text-white text-sm font-black transition-all shadow-md flex items-center justify-center gap-1.5 active:scale-[0.98]"
                >
                    이제 짧은 글을 읽어 볼까요? <ChevronRight size={16} />
                </button>
                <p className="text-xs text-gray-500 font-medium">
                    글을 읽은 뒤에는 내용을 묻는 문제를 풀어요. 글은 문제를 풀 때 다시 볼 수 있어요.
                </p>
            </div>
        );
    }

    const question = questions[index];
    const result = results[question.id];
    const answered = !!result;
    const pending = pendingId === question.id;
    const meta = (question.question_type && TYPE_META[question.question_type]) || TYPE_META.meaning;
    const isLast = index === total - 1;
    const cheer = result?.is_correct ? RIGHT_CHEERS[index % RIGHT_CHEERS.length] : WRONG_CHEERS[index % WRONG_CHEERS.length];

    const optionClass = (oIdx: number) => {
        const base =
            "w-full p-4 sm:p-5 rounded-2xl border text-left transition-all flex items-center gap-3 font-bold text-base";
        if (!answered) {
            return `${base} bg-[#F9FAFB] border-gray-100 text-gray-800 hover:bg-gray-100/80 active:scale-[0.98] ${
                pending ? "opacity-60" : ""
            }`;
        }
        if (oIdx === result.correct_answer) {
            return `${base} bg-[#E8F5E9] border-[#16A34A] text-[#14532D] ring-2 ring-[#16A34A]/20 animate-in zoom-in-95 duration-200`;
        }
        if (oIdx === result.selected) return `${base} bg-red-50 border-red-300 text-red-700`;
        return `${base} bg-gray-50 border-gray-100 text-gray-400`;
    };

    return (
        <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between gap-3">
                <div
                    className="flex gap-1.5"
                    role="progressbar"
                    aria-valuemin={1}
                    aria-valuemax={total}
                    aria-valuenow={index + 1}
                    aria-label={`낱말 퀴즈 ${index + 1} / ${total}`}
                >
                    {questions.map((q, i) => {
                        const r = results[q.id];
                        return (
                            <span
                                key={q.id}
                                className={`w-7 h-2.5 rounded-full transition-colors ${
                                    r ? (r.is_correct ? "bg-[#16A34A]" : "bg-red-300") : i === index ? "bg-[#2E5A44]" : "bg-gray-200"
                                }`}
                            />
                        );
                    })}
                </div>
                {stats.combo >= 2 && (
                    <span
                        key={stats.combo}
                        className="inline-flex items-center gap-1 text-xs font-black text-orange-600 bg-orange-50 border border-orange-100 px-3 py-1 rounded-full animate-in zoom-in-50 duration-200"
                    >
                        <Flame size={13} /> {stats.combo}연속 정답!
                    </span>
                )}
            </div>

            <div className="bg-white rounded-[32px] border border-gray-100 p-6 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-6">
                <div>
                    <span className="inline-flex items-center gap-1.5 text-xs font-extrabold px-3 py-1 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200 mb-3">
                        <span aria-hidden="true">{meta.emoji}</span> 낱말 퀴즈 · {meta.label}
                    </span>
                    <p className="text-xs font-bold text-gray-500 mb-2">{meta.hint}</p>
                    <h2 className="text-xl sm:text-2xl font-black text-[#1A1A1A] leading-snug break-keep whitespace-pre-line">
                        {question.question}
                    </h2>
                </div>

                <div className="space-y-3" role="radiogroup" aria-label={`낱말 퀴즈 ${index + 1}번 보기`}>
                    {question.options.map((opt, oIdx) => (
                        <button
                            key={oIdx}
                            type="button"
                            role="radio"
                            aria-checked={answered && result.selected === oIdx}
                            disabled={answered || pending}
                            onClick={() => onAnswer(question, oIdx)}
                            className={optionClass(oIdx)}
                        >
                            <span
                                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                                    answered && oIdx === result.correct_answer
                                        ? "bg-[#16A34A] text-white"
                                        : answered && oIdx === result.selected
                                        ? "bg-red-400 text-white"
                                        : "bg-white border border-gray-200 text-gray-500"
                                }`}
                            >
                                {answered && oIdx === result.correct_answer ? (
                                    <Check size={14} />
                                ) : answered && oIdx === result.selected ? (
                                    <X size={14} />
                                ) : (
                                    oIdx + 1
                                )}
                            </span>
                            <span className="flex-1 break-keep">{opt}</span>
                        </button>
                    ))}
                </div>

                <div aria-live="polite">
                    {answered && (
                        <div
                            className={`rounded-2xl p-4 space-y-1.5 animate-in slide-in-from-bottom-2 duration-300 ${
                                result.is_correct ? "bg-emerald-50 border border-emerald-100" : "bg-amber-50 border border-amber-100"
                            }`}
                        >
                            <p className={`text-sm font-black ${result.is_correct ? "text-emerald-800" : "text-amber-800"}`}>
                                {cheer}
                            </p>
                            <p className="text-xs sm:text-sm font-medium text-gray-700 leading-relaxed">
                                <span className="font-black text-gray-900 mr-1">💡</span>
                                {result.explanation}
                            </p>
                        </div>
                    )}
                </div>

                <button
                    type="button"
                    disabled={!answered}
                    onClick={onNext}
                    className="w-full py-4 rounded-2xl bg-[#2E5A44] hover:bg-[#1E3F2F] disabled:bg-gray-200 disabled:text-gray-500 text-white text-sm font-black transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98]"
                >
                    {isLast ? (
                        <>
                            <Sparkles size={16} /> 결과 보기
                        </>
                    ) : (
                        <>
                            다음 문제 <ChevronRight size={16} />
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
