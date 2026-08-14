"use client";

import React, { useState } from "react";
import { X, Building, MapPin, Phone, Clock, CalendarX, Copy, ExternalLink, Check, BookOpen } from "lucide-react";
import { toast } from "sonner";

export interface LibraryStatusDetail {
    libCode: string;
    libName: string;
    hasBook: string;
    loanAvailable: string;
    callNumber?: string;
    shelfLocName?: string;
    separateShelfName?: string;
    homepage?: string;
    operatingTime?: string;
    closed?: string;
    tel?: string;
    address?: string;
}

interface LibraryDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    bookTitle: string;
    bookAuthor?: string;
    bookIsbn?: string;
    status: LibraryStatusDetail | null;
}

export default function LibraryDetailModal({
    isOpen,
    onClose,
    bookTitle,
    bookAuthor,
    bookIsbn,
    status
}: LibraryDetailModalProps) {
    const [copied, setCopied] = useState(false);

    if (!isOpen || !status) return null;

    const isNotHeld = status.hasBook === 'N';
    const isLoanable = status.hasBook === 'Y' && status.loanAvailable === 'Y';
    const isCheckedOut = status.hasBook === 'Y' && status.loanAvailable === 'N';

    const handleCopyCallNumber = () => {
        if (!status.callNumber) {
            toast.error("복사할 청구기호 정보가 없습니다.");
            return;
        }

        const textToCopy = `[${status.libName}] 청구기호: ${status.callNumber} (${bookTitle})`;
        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        toast.success("청구기호가 클립보드에 복사되었습니다!");

        setTimeout(() => setCopied(false), 2000);
    };

    const getTargetUrl = () => {
        let targetUrl = status.homepage;
        if (!targetUrl) {
            return `https://search.naver.com/search.naver?query=${encodeURIComponent(status.libName + ' ' + bookTitle)}`;
        }
        if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
            return 'http://' + targetUrl;
        }
        return targetUrl;
    };

    const handleGoToHomepageClick = () => {
        if (status.callNumber) {
            try {
                navigator.clipboard.writeText(`청구기호: ${status.callNumber}`);
                toast.info("청구기호가 복사되었습니다! 도서관 검색창에 활용해보세요.", { duration: 3500 });
            } catch (e) {
                console.warn("Clipboard write failed:", e);
            }
        }
    };

    const targetUrl = getTargetUrl();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-6 sm:p-8 shadow-2xl border border-gray-100 relative overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
                    aria-label="닫기"
                >
                    <X size={20} />
                </button>

                {/* Header Header */}
                <div className="flex items-center gap-3 mb-6 pr-8">
                    <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center shrink-0 font-bold">
                        <Building size={24} />
                    </div>
                    <div className="min-w-0">
                        <span className="text-xs font-bold text-green-600 bg-green-50 px-2.5 py-0.5 rounded-full inline-block mb-1">
                            도서관 현장 책 찾기 카드
                        </span>
                        <h2 className="text-lg sm:text-xl font-black text-gray-900 truncate">
                            {status.libName}
                        </h2>
                    </div>
                </div>

                {/* Main Scrollable Content */}
                <div className="overflow-y-auto space-y-5 pr-1 -mr-1">

                    {/* Book Information Header */}
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <p className="text-xs font-bold text-gray-400 mb-1">도서 정보</p>
                        <p className="font-bold text-gray-900 text-sm line-clamp-1">{bookTitle}</p>
                        {bookAuthor && <p className="text-xs text-gray-500 mt-0.5">{bookAuthor}</p>}
                    </div>

                    {/* Status Banner */}
                    <div className="flex items-center justify-between p-4 rounded-2xl border bg-white shadow-sm">
                        <span className="text-xs font-bold text-gray-500">소장 / 대출 상태</span>
                        {isNotHeld && (
                            <span className="px-3 py-1.5 bg-red-50 text-red-600 text-xs font-black rounded-lg border border-red-100">
                                미소장 도서
                            </span>
                        )}
                        {isLoanable && (
                            <span className="px-3 py-1.5 bg-green-500 text-white text-xs font-black rounded-lg shadow-sm shadow-green-100 flex items-center gap-1.5">
                                <Check size={14} /> 대출 가능
                            </span>
                        )}
                        {isCheckedOut && (
                            <span className="px-3 py-1.5 bg-orange-100 text-orange-700 text-xs font-black rounded-lg border border-orange-200">
                                현재 대출 중
                            </span>
                        )}
                    </div>

                    {/* Call Number & Shelf Location Card (Crucial Feature) */}
                    {status.hasBook === 'Y' && (
                        <div className="p-5 bg-emerald-50/70 border border-emerald-200/80 rounded-3xl space-y-4 relative">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <BookOpen size={18} className="text-emerald-700" />
                                    <span className="font-black text-emerald-900 text-sm">청구기호 & 서가 위치</span>
                                </div>
                                {status.callNumber && (
                                    <button
                                        onClick={handleCopyCallNumber}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-emerald-100/60 text-emerald-700 rounded-full border border-emerald-200 text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                                    >
                                        {copied ? <Check size={13} /> : <Copy size={13} />}
                                        {copied ? "복사됨" : "청구기호 복사"}
                                    </button>
                                )}
                            </div>

                            <div className="bg-white p-4 rounded-2xl border border-emerald-100 space-y-2 shadow-sm">
                                <div>
                                    <span className="text-[11px] font-bold text-gray-400 block mb-0.5">청구기호</span>
                                    <p className="text-lg sm:text-xl font-black text-emerald-800 tracking-wide font-mono">
                                        {status.callNumber || "청구기호 정보 없음"}
                                    </p>
                                </div>

                                {(status.shelfLocName || status.separateShelfName) && (
                                    <div className="pt-2 border-t border-gray-100 flex items-center gap-2">
                                        <MapPin size={15} className="text-emerald-600 shrink-0" />
                                        <span className="text-xs font-bold text-gray-700">
                                            {[status.separateShelfName, status.shelfLocName].filter(Boolean).join(" · ")}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Library Metadata Details */}
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3 text-xs text-gray-600">
                        {status.address && (
                            <div className="flex items-start gap-2.5">
                                <MapPin size={15} className="text-gray-400 shrink-0 mt-0.5" />
                                <span>{status.address}</span>
                            </div>
                        )}
                        {status.tel && (
                            <div className="flex items-center gap-2.5">
                                <Phone size={15} className="text-gray-400 shrink-0" />
                                <span>{status.tel}</span>
                            </div>
                        )}
                        {status.operatingTime && (
                            <div className="flex items-start gap-2.5">
                                <Clock size={15} className="text-gray-400 shrink-0 mt-0.5" />
                                <span>운영시간: {status.operatingTime}</span>
                            </div>
                        )}
                        {status.closed && (
                            <div className="flex items-start gap-2.5">
                                <CalendarX size={15} className="text-red-400 shrink-0 mt-0.5" />
                                <span className="text-red-600 font-medium">휴관일: {status.closed}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="mt-6 pt-4 border-t border-gray-100 flex gap-3 shrink-0">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm rounded-2xl transition-all cursor-pointer"
                    >
                        닫기
                    </button>
                    <a
                        href={targetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={handleGoToHomepageClick}
                        className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-bold text-sm rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-200 active:scale-95 cursor-pointer no-underline"
                    >
                        <span>도서관 홈페이지 이동</span>
                        <ExternalLink size={16} />
                    </a>
                </div>
            </div>
        </div>
    );
}
