"use client";

import { useState } from "react";
import { Bookmark, BookOpen, Check, ChevronDown } from "lucide-react";
import type { Book } from "@shared/types";
import { getOptimizedImageUrl } from "@shared/lib/image-utils";
import { LOAN_STATE_META, type LoanState } from "./libraryStatus";

interface BookInfoHeroProps {
    book: Book;
    /** 등록한 도서관 기준 대표 대출 상태. null 이면 배지를 숨깁니다. */
    loanState: LoanState | null;
    isScrapped: boolean;
    isRead: boolean;
    onScrap: () => void;
    onMarkRead: () => void;
}

const iconButton = "flex h-8 w-8 items-center justify-center rounded-full border border-[#E7E7E7] bg-white text-[#2A2A2A] active:scale-95 transition-transform";

/** 모바일 도서 정보 상단: 대출 상태 배지를 최상단에 두는 위계 (Figma: 도서정보_to be) */
export default function BookInfoHero({ book, loanState, isScrapped, isRead, onScrap, onMarkRead }: BookInfoHeroProps) {
    const [detailOpen, setDetailOpen] = useState(false);
    const cover = getOptimizedImageUrl(book.imgsrc, "detail");
    const hasDetail = !!(book.description || book.toc);

    return (
        <section className="relative overflow-hidden px-5 pb-6 pt-8">
            {/* 표지를 흐리게 깔고 아래로 갈수록 흰색으로 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-125 object-cover opacity-30 blur-2xl" />
            <div className="absolute inset-0 bg-gradient-to-b from-white/0 via-white/40 to-white" aria-hidden />

            <div className="relative flex gap-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cover} alt={book.title} className="h-[193px] w-[148px] shrink-0 rounded-[9px] border border-[#E7E7E7] object-cover" />

                <div className="flex min-w-0 flex-1 flex-col gap-3.5 pt-1">
                    <div className="flex items-center justify-between">
                        {loanState ? (
                            <span className={`flex h-[27px] items-center rounded-full px-2.5 text-[14px] font-bold text-white ${LOAN_STATE_META[loanState].badge}`}>
                                {LOAN_STATE_META[loanState].label}
                            </span>
                        ) : <span />}
                        <div className="flex gap-1">
                            <button type="button" onClick={onScrap} aria-label={isScrapped ? "찜 취소" : "찜하기"} aria-pressed={isScrapped} className={`${iconButton} ${isScrapped ? "!border-[#00AD31] !text-[#00AD31]" : ""}`}>
                                <Bookmark size={15} fill={isScrapped ? "currentColor" : "none"} />
                            </button>
                            <button type="button" onClick={onMarkRead} aria-label={isRead ? "읽은 책" : "읽었어요"} aria-pressed={isRead} className={`${iconButton} ${isRead ? "!border-[#00AD31] !text-[#00AD31]" : ""}`}>
                                {isRead ? <Check size={15} /> : <BookOpen size={15} />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <h1 className="text-[20px] font-bold leading-snug text-[#0F172A] break-keep">{book.title}</h1>
                        <p className="mt-2 flex items-center gap-1.5 text-[12px] font-medium text-[#2A2A2A]">
                            <span className="truncate">{book.author}</span>
                            {book.publisher && (
                                <>
                                    <span className="h-2 w-px shrink-0 bg-[#A8A8A8]" aria-hidden />
                                    <span className="truncate">{book.publisher}</span>
                                </>
                            )}
                        </p>
                    </div>

                    <div className="border-t border-[#E3E3E3] pt-2">
                        <button
                            type="button"
                            onClick={() => hasDetail && setDetailOpen(open => !open)}
                            aria-expanded={detailOpen}
                            className="flex w-full items-center justify-between text-left"
                        >
                            <span>
                                <span className="block text-[14px] font-semibold text-black">책 정보 · 줄거리</span>
                                <span className="mt-1 block text-[12px] font-medium text-[#969696]">
                                    장르 <span className="ml-2.5 text-[#454545]">{book.category}</span>
                                </span>
                            </span>
                            {hasDetail && <ChevronDown size={16} className={`shrink-0 text-[#6D6D6D] transition-transform ${detailOpen ? "rotate-180" : ""}`} />}
                        </button>
                    </div>
                </div>
            </div>

            {detailOpen && (
                <div className="relative mt-5 flex flex-col gap-4 rounded-[8px] bg-white/80 p-4 text-[13px] leading-relaxed text-[#2A2A2A]">
                    {book.description && <p className="whitespace-pre-line">{book.description}</p>}
                    {book.toc && (
                        <div>
                            <h3 className="mb-1.5 text-[12px] font-bold text-gray-400">목차</h3>
                            <p className="max-h-48 overflow-y-auto whitespace-pre-line text-[12px] text-gray-600">{book.toc.replace(/<[^>]*>?/gm, "")}</p>
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}
