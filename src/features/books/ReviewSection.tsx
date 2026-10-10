"use client";

import { useMemo, useState } from "react";
import { Star } from "lucide-react";
import type { Review } from "@shared/types";

const INITIAL_VISIBLE = 2;
const DISTRIBUTION_ROWS = [5, 4, 3] as const;
const DOT_COUNT = 10;

const stars = (rating: number) => "★".repeat(rating) + "☆".repeat(5 - rating);
const formatDate = (iso: string) => iso.slice(0, 10).replaceAll("-", ".");

interface ReviewSectionProps {
    reviews: Review[];
    isLoggedIn: boolean;
    onLogin: () => void;
    /** 성공하면 true */
    onSubmit: (rating: number, text: string) => Promise<boolean>;
}

export default function ReviewSection({ reviews, isLoggedIn, onLogin, onSubmit }: ReviewSectionProps) {
    const [expanded, setExpanded] = useState(false);
    const [writing, setWriting] = useState(false);
    const [rating, setRating] = useState(0);
    const [text, setText] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const stats = useMemo(() => {
        const count = reviews.length;
        const countByScore = new Map<number, number>();
        let sum = 0;
        for (const r of reviews) {
            sum += r.rating;
            countByScore.set(r.rating, (countByScore.get(r.rating) ?? 0) + 1);
        }
        return { count, average: count ? sum / count : 0, countByScore };
    }, [reviews]);

    const visible = expanded ? reviews : reviews.slice(0, INITIAL_VISIBLE);

    const handleSubmit = async () => {
        if (!rating || !text.trim() || submitting) return;
        setSubmitting(true);
        const ok = await onSubmit(rating, text.trim());
        setSubmitting(false);
        if (ok) {
            setRating(0);
            setText("");
            setWriting(false);
        }
    };

    return (
        <section className="px-5 py-6">
            <h2 className="text-[18px] font-bold text-black">독자 리뷰</h2>
            <p className="mt-1 mb-4 text-[12px] font-medium text-black">이 책을 읽은 독자들의 생생한 후기</p>

            {stats.count > 0 ? (
                <>
                    <div className="flex items-center justify-between rounded-[8px] bg-[#F8F8F8] p-[17px]">
                        <div className="flex flex-col gap-1">
                            <span className="text-[24px] font-bold leading-none text-[#00AD31]">{stats.average.toFixed(1)}</span>
                            <span className="text-[13px] font-medium text-[#01C950]">{stars(Math.round(stats.average))}</span>
                            <span className="text-[10px] font-medium text-black">총 {stats.count}개 리뷰</span>
                        </div>
                        <div className="flex flex-col items-end gap-1 text-[10px] font-medium text-black">
                            {DISTRIBUTION_ROWS.map(score => {
                                const filled = Math.round(((stats.countByScore.get(score) ?? 0) / stats.count) * DOT_COUNT);
                                return (
                                    <p key={score} className="whitespace-pre">{`${score}점  ${"●".repeat(filled)}${"○".repeat(DOT_COUNT - filled)}`}</p>
                                );
                            })}
                        </div>
                    </div>

                    <ul className="mt-4 flex flex-col gap-4">
                        {visible.map(review => {
                            const nickname = review.profiles?.nickname || "사용자";
                            return (
                                <li key={review.id} className="flex flex-col gap-2 rounded-[8px] bg-[#F8F8F8] p-[17px]">
                                    <div className="flex items-center gap-2">
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-200 text-[13px] font-bold text-gray-500" aria-hidden>
                                            {nickname.charAt(0)}
                                        </span>
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[13px] font-bold text-black">{nickname}</span>
                                            <span className="text-[10px] font-medium text-black">{formatDate(review.created_at)}</span>
                                        </div>
                                    </div>
                                    <span className="text-[12px] font-medium text-[#01C950]">{stars(review.rating)}</span>
                                    <p className="text-[13px] font-medium text-black break-words whitespace-pre-line">{review.review_text}</p>
                                </li>
                            );
                        })}
                    </ul>

                    {!expanded && reviews.length > INITIAL_VISIBLE && (
                        <button type="button" onClick={() => setExpanded(true)} className="mt-4 w-full rounded-[5px] bg-[#00AD31] py-3 text-[13px] font-bold text-white active:scale-[0.99] transition-transform">
                            리뷰 더보기
                        </button>
                    )}
                </>
            ) : (
                <p className="rounded-[8px] bg-[#F8F8F8] py-8 text-center text-[13px] font-medium text-gray-400">아직 작성된 리뷰가 없어요. 첫 리뷰를 남겨주세요!</p>
            )}

            {/* 리뷰 작성 (디자인 외 기능: 기존 작성 기능 유지) */}
            <div className="mt-4">
                {!isLoggedIn ? (
                    <button type="button" onClick={onLogin} className="w-full rounded-[5px] border border-[#00AD31] py-3 text-[13px] font-bold text-[#00AD31]">
                        로그인하고 리뷰 작성하기
                    </button>
                ) : !writing ? (
                    <button type="button" onClick={() => setWriting(true)} className="w-full rounded-[5px] border border-[#00AD31] py-3 text-[13px] font-bold text-[#00AD31]">
                        리뷰 작성하기
                    </button>
                ) : (
                    <div className="rounded-[8px] bg-[#F8F8F8] p-[17px]">
                        <div className="mb-3 flex gap-1.5">
                            {[1, 2, 3, 4, 5].map(star => (
                                <button key={star} type="button" onClick={() => setRating(star)} aria-label={`${star}점`} className={rating >= star ? "text-yellow-400" : "text-gray-300"}>
                                    <Star size={24} fill={rating >= star ? "currentColor" : "none"} />
                                </button>
                            ))}
                        </div>
                        <textarea
                            value={text}
                            onChange={e => setText(e.target.value)}
                            placeholder="이 책에 대한 평을 남겨주세요..."
                            rows={3}
                            className="mb-3 w-full resize-none rounded-[8px] border border-gray-200 bg-white p-3 text-[13px] outline-none focus:border-[#00AD31]"
                        />
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setWriting(false)} className="flex-1 rounded-[5px] border border-gray-300 py-2.5 text-[13px] font-bold text-gray-500">취소</button>
                            <button type="button" onClick={handleSubmit} disabled={!rating || !text.trim() || submitting} className="flex-1 rounded-[5px] bg-[#00AD31] py-2.5 text-[13px] font-bold text-white disabled:bg-gray-200 disabled:text-gray-400">
                                {submitting ? "등록 중..." : "등록"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
