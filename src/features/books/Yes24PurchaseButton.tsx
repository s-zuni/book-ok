"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import ParentalGateModal from "@shared/ui/ParentalGateModal";

const GATE_SESSION_KEY = "bookok_purchase_gate_ok";

interface Yes24PurchaseButtonProps {
    /** 예스24 애드온 링크(`addOnLink`, 미신청 시 일반 상품 링크). 그대로 사용하며 가공하지 않습니다. */
    url?: string;
    className?: string;
}

const gatePassedThisSession = () => {
    try { return sessionStorage.getItem(GATE_SESSION_KEY) === "1"; } catch { return false; }
};

/**
 * 예스24 상품 상세페이지로 이동하는 구매 버튼. 이 링크로 구매가 발생하면 북콕이 소정의 수수료를 받을 수 있어
 * 버튼 아래에 그 사실을 함께 안내합니다(예스24 Open API 이용약관: 상품 상세페이지 링크 제공).
 * 네이티브 앱(어린이 대상 스토어 정책)에서는 외부 쇼핑몰로 나가기 전에 보호자 확인을 한 번 거칩니다.
 */
export default function Yes24PurchaseButton({ url, className = "" }: Yes24PurchaseButtonProps) {
    const [gateOpen, setGateOpen] = useState(false);

    if (!url) return null;

    const openStore = async () => {
        if (Capacitor.isNativePlatform()) {
            await Browser.open({ url });
        } else {
            window.open(url, "_blank", "noopener,noreferrer");
        }
    };

    const handleClick = () => {
        if (Capacitor.isNativePlatform() && !gatePassedThisSession()) {
            setGateOpen(true);
            return;
        }
        void openStore();
    };

    const handleGateSuccess = () => {
        try { sessionStorage.setItem(GATE_SESSION_KEY, "1"); } catch { /* 이번 한 번만 통과 */ }
        setGateOpen(false);
        void openStore();
    };

    return (
        <div className={className}>
            <button
                type="button"
                onClick={handleClick}
                className="flex h-12 w-full items-center justify-center gap-1.5 rounded-[8px] border border-[#00AD31] bg-white text-[14px] font-bold text-[#00AD31] transition-transform active:scale-[0.99]"
            >
                <span>구매하기</span>
                <ExternalLink size={14} />
            </button>
            <p className="mt-2 text-center text-[11px] leading-relaxed text-gray-400 break-keep">
                예스24 제휴(애드온) 링크예요. 이 링크로 구매하시면 북콕이 소정의 수수료를 받을 수 있어요.
            </p>

            <ParentalGateModal
                isOpen={gateOpen}
                onClose={() => setGateOpen(false)}
                onSuccess={handleGateSuccess}
                title="보호자(성인) 확인"
                description="외부 쇼핑몰(예스24)로 이동하기 위해 보호자(성인) 확인이 필요합니다."
            />
        </div>
    );
}
