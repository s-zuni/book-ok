"use client";

import { ShieldAlert, Info } from "lucide-react";

interface ChildSafetyBannerProps {
    className?: string;
    compact?: boolean;
}

export default function ChildSafetyBanner({ className = "", compact = false }: ChildSafetyBannerProps) {
    if (compact) {
        return (
            <div className={`bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3.5 text-xs text-amber-900 flex items-start gap-2.5 ${className}`}>
                <ShieldAlert size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <p className="font-extrabold text-amber-950">🛡️ 아동 보호 및 온라인 안전 수칙</p>
                    <p className="text-[11px] leading-relaxed text-amber-800">
                        성명, 전화번호, 주소 등 개인정보 공유 금지 | 낯선 사람과의 1:1 대화 불가 (공개 게시판 전용)
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={`bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/90 rounded-[2rem] p-5 text-amber-950 shadow-xs ${className}`}>
            <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs">
                    <ShieldAlert size={18} />
                </div>
                <div>
                    <h4 className="font-black text-sm text-amber-950">🛡️ 아동 온라인 안전 및 소셜 이용 안내</h4>
                    <span className="text-[10px] font-bold text-amber-700">Google Play 가족 정책 준수 안내</span>
                </div>
            </div>

            <div className="space-y-2 text-xs leading-relaxed text-amber-900 bg-white/70 backdrop-blur-xs rounded-2xl p-4 border border-amber-100">
                <div className="flex items-start gap-2">
                    <span className="font-black text-amber-600 shrink-0">1.</span>
                    <p><strong>개인정보 보호 필수:</strong> 실명, 전화번호, 집 주소, 학교 등 개인정보는 절대로 글이나 댓글에 입력하지 마세요.</p>
                </div>
                <div className="flex items-start gap-2">
                    <span className="font-black text-amber-600 shrink-0">2.</span>
                    <p><strong>오프라인 상호작용 위험 금지:</strong> 온라인에서 만난 낯선 사람과 실제로 만나는 것은 매우 위험합니다. 낯선 이와의 개인적인 접촉을 피하세요.</p>
                </div>
                <div className="flex items-start gap-2">
                    <span className="font-black text-amber-600 shrink-0">3.</span>
                    <p><strong>1:1 개인 메시지(DM) 미제공:</strong> 북콕 커뮤니티는 모든 회원이 함께 이용하는 **전체 공개 게시판**입니다. 1:1 비공개 대화 기능은 제공되지 않습니다.</p>
                </div>
                <div className="flex items-start gap-2">
                    <span className="font-black text-amber-600 shrink-0">4.</span>
                    <p><strong>보호자 모니터링:</strong> 게시글 작성 시 보호자의 감독(성인 확인 게이트)을 받거나 마이페이지 자녀 보호 기능을 활용해 주세요.</p>
                </div>
            </div>
        </div>
    );
}
