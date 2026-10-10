"use client";

import { Building2, ExternalLink, MapPin } from "lucide-react";
import type { LibraryStatusDetail } from "./LibraryDetailModal";
import { getLoanState, LOAN_STATE_META } from "./libraryStatus";

interface LibraryHoldingsSectionProps {
    isLoggedIn: boolean;
    favoriteLibraryCount: number;
    loading: boolean;
    statuses: LibraryStatusDetail[];
    onLogin: () => void;
    onRegisterLibrary: () => void;
    onSelect: (status: LibraryStatusDetail) => void;
}

function EmptyNotice({ title, description, action, onAction }: { title: string; description: string; action: string; onAction: () => void }) {
    return (
        <div className="flex items-center justify-between gap-3 rounded-[8px] bg-[#F8FAFC] p-4">
            <div className="min-w-0">
                <p className="text-[14px] font-semibold text-[#1B1B1B]">{title}</p>
                <p className="mt-1 text-[12px] leading-relaxed text-gray-500 break-keep">{description}</p>
            </div>
            <button type="button" onClick={onAction} className="shrink-0 rounded-full bg-[#00AD31] px-3.5 py-2 text-[12px] font-bold text-white active:scale-95 transition-transform">
                {action}
            </button>
        </div>
    );
}

/** 우리동네 도서관 소장 현황 (모바일). 카드를 누르면 도서관 상세(외부 랜딩 포함)로 이동합니다. */
export default function LibraryHoldingsSection({ isLoggedIn, favoriteLibraryCount, loading, statuses, onLogin, onRegisterLibrary, onSelect }: LibraryHoldingsSectionProps) {
    return (
        <section className="px-5 pt-6">
            <div className="mb-3.5 flex items-center gap-1.5">
                <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-green-50 text-[#00AD31]">
                    <MapPin size={17} />
                </span>
                <h2 className="text-[17px] font-semibold text-black">우리동네 도서관 소장 현황</h2>
            </div>

            {!isLoggedIn ? (
                <EmptyNotice title="로그인하고 소장 정보를 확인해 보세요" description="자주 가는 도서관을 등록하면 대출 가능 여부를 바로 알 수 있어요." action="로그인" onAction={onLogin} />
            ) : favoriteLibraryCount === 0 ? (
                <EmptyNotice title="등록된 도서관이 없어요" description="마이페이지에서 자주 가는 도서관을 등록해 주세요." action="등록하기" onAction={onRegisterLibrary} />
            ) : loading ? (
                <div className="flex flex-col gap-1.5">
                    {Array.from({ length: Math.min(favoriteLibraryCount, 3) }).map((_, i) => (
                        <div key={i} className="h-[60px] animate-pulse rounded-[8px] bg-[#F8FAFC]" />
                    ))}
                </div>
            ) : statuses.length > 0 ? (
                <ul className="flex flex-col gap-1.5">
                    {statuses.map(status => {
                        const meta = LOAN_STATE_META[getLoanState(status)];
                        return (
                            <li key={status.libCode}>
                                <button
                                    type="button"
                                    onClick={() => onSelect(status)}
                                    className="flex h-[60px] w-full items-center gap-3 rounded-[8px] bg-[#F8FAFC] px-3 text-left active:scale-[0.99] transition-transform"
                                >
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#868786] shadow-[0_0_0_1px_#EEF0F2]">
                                        <Building2 size={17} />
                                    </span>
                                    <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-[#1B1B1B]">{status.libName}</span>
                                    <span className={`flex shrink-0 items-center gap-1 text-[12px] font-extrabold ${meta.text}`}>
                                        <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                                        {meta.label}
                                        <ExternalLink size={11} className="text-[#868786]" />
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            ) : (
                <p className="py-4 text-center text-[13px] text-gray-400">소장 정보를 불러오지 못했어요.</p>
            )}
        </section>
    );
}
