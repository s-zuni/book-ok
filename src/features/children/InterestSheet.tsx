"use client";

import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@shared/lib/supabase";
import BottomSheet from "@shared/ui/BottomSheet";
import { useAuth } from "@features/auth/AuthContext";
import { INTEREST_TOPICS, MAX_INTERESTS, parseInterestIds } from "@features/books/interestTopics";
import type { Child } from "@shared/types";

interface InterestSheetProps {
    open: boolean;
    onClose: () => void;
    child: Child;
}

export default function InterestSheet({ open, onClose, child }: InterestSheetProps) {
    return (
        <BottomSheet open={open} onClose={onClose} label="관심사 선택">
            {/* 시트가 열릴 때마다 마운트되어 저장된 관심사로 초기화됩니다 */}
            <InterestSheetBody onClose={onClose} child={child} />
        </BottomSheet>
    );
}

function InterestSheetBody({ onClose, child }: Omit<InterestSheetProps, "open">) {
    const { user, refreshChildren } = useAuth();
    const [selected, setSelected] = useState(() => parseInterestIds(child.preferred_topics));
    const [saving, setSaving] = useState(false);

    const toggle = (id: string) => {
        if (selected.includes(id)) {
            setSelected(prev => prev.filter(t => t !== id));
        } else if (selected.length >= MAX_INTERESTS) {
            toast.info(`관심사는 최대 ${MAX_INTERESTS}개까지 선택할 수 있어요`);
        } else {
            setSelected(prev => [...prev, id]);
        }
    };

    const handleSave = async () => {
        if (!user || selected.length === 0 || saving) return;
        setSaving(true);
        const { error } = await supabase
            .from("children")
            .update({ preferred_topics: selected })
            .eq("id", child.id)
            .eq("parent_id", user.id);

        if (error) {
            console.error("Interest save error:", error);
            toast.error("관심사를 저장하지 못했어요. 잠시 후 다시 시도해주세요.");
            setSaving(false);
            return;
        }
        await refreshChildren();
        toast.success(`${child.name}의 관심사를 저장했어요`);
        setSaving(false);
        onClose();
    };

    return (
        <>
            <h2 className="text-center text-[17px] font-bold text-[#2A2A2A] tracking-tight break-keep">
                {child.name}가 요즘 좋아하는 주제를 골라보세요
            </h2>
            <p className="mt-2 mb-6 text-center text-[13px] font-medium text-gray-500">최대 {MAX_INTERESTS}개까지 선택할 수 있어요</p>

            <div className="grid grid-cols-3 gap-x-3 gap-y-3 mb-8">
                {INTEREST_TOPICS.map(({ id, label, Icon }) => {
                    const isSelected = selected.includes(id);
                    return (
                        <button
                            key={id}
                            type="button"
                            onClick={() => toggle(id)}
                            aria-pressed={isSelected}
                            className={`flex items-center justify-center gap-1.5 h-11 rounded-full border text-[13px] font-semibold transition-colors active:scale-95 ${
                                isSelected
                                    ? "bg-[#F0FDF4] border-[#16A34A] text-[#16A34A]"
                                    : "bg-white border-gray-300 text-gray-600"
                            }`}
                        >
                            <Icon size={16} />
                            <span>{label}</span>
                        </button>
                    );
                })}
            </div>

            <button
                type="button"
                onClick={handleSave}
                disabled={selected.length === 0 || saving}
                className="w-full h-12 rounded-[4px] bg-[#16A34A] text-white text-[15px] font-bold disabled:bg-gray-200 disabled:text-gray-400 active:scale-[0.99] transition-transform"
            >
                {saving ? "저장 중..." : "관심사 저장"}
            </button>
            <button type="button" onClick={onClose} className="mt-3 w-full py-2 text-[14px] font-medium text-gray-500">
                닫기
            </button>
        </>
    );
}
