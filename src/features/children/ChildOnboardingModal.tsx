"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { X, ArrowLeft, Check, Sparkles, User, Calendar, Heart, ShieldCheck } from "lucide-react";
import { supabase } from "@shared/lib/supabase";
import { useAuth } from "@features/auth/AuthContext";
import { Child } from "@shared/types";
import { ALADIN_TOPIC_CATEGORIES } from "@features/books/recommendationEngine";
import { toast } from "sonner";

interface ChildOnboardingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (child: Child) => void;
}

type OnboardingStep = 'prompt' | 'info' | 'preferences';

export default function ChildOnboardingModal({ isOpen, onClose, onSuccess }: ChildOnboardingModalProps) {
    const { user, refreshChildren } = useAuth();
    const [step, setStep] = useState<OnboardingStep>('prompt');
    const [name, setName] = useState("");
    const [birthdate, setBirthdate] = useState("");
    const [gender, setGender] = useState<string>("선택안함");
    const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
            setStep('prompt');
            setName("");
            setBirthdate("");
            setGender("선택안함");
            setSelectedTopics([]);
            setIsSubmitting(false);
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    // Calculate age & type preview
    const calculateAgeAndType = (bDate: string) => {
        if (!bDate) return { age: 0, typeText: "연령 미지정" };
        const birthYear = new Date(bDate).getFullYear();
        const currentYear = new Date().getFullYear();
        const age = Math.max(0, currentYear - birthYear);

        let typeText = "유아 (0~6세)";
        let typeCode = "유아";
        if (age >= 7 && age <= 9) {
            typeText = "초등 저학년 (7~9세)";
            typeCode = "초등저학년";
        } else if (age >= 10) {
            typeText = "초등 고학년 (10세 이상)";
            typeCode = "초등고학년";
        }
        return { age, typeText, typeCode };
    };

    const handleTopicToggle = (topicLabel: string) => {
        if (selectedTopics.includes(topicLabel)) {
            setSelectedTopics(prev => prev.filter(t => t !== topicLabel));
        } else {
            if (selectedTopics.length >= 3) {
                toast.info("선호 주제는 최대 3개까지 선택할 수 있어요!");
                return;
            }
            setSelectedTopics(prev => [...prev, topicLabel]);
        }
    };

    const handleSaveChildProfile = async (skipTopics = false) => {
        if (!name.trim()) {
            toast.error("아이의 이름 또는 애칭을 입력해주세요.");
            setStep('info');
            return;
        }
        if (!birthdate) {
            toast.error("아이의 생년월일을 선택해주세요.");
            setStep('info');
            return;
        }
        if (!user) {
            toast.error("로그인이 필요합니다.");
            return;
        }

        setIsSubmitting(true);
        try {
            const { age, typeCode } = calculateAgeAndType(birthdate);
            const topicsToSave = skipTopics ? [] : selectedTopics;

            const { data, error } = await supabase.from('children').insert({
                parent_id: user.id,
                name: name.trim(),
                birthdate: birthdate,
                gender: gender === "선택안함" ? null : gender,
                type: typeCode,
                preferred_topics: topicsToSave
            }).select().single();

            if (error) {
                console.error("Child insertion error:", error);
                toast.error("자녀 프로필 저장 실패: " + error.message);
                return;
            }

            if (data) {
                const newChild: Child = {
                    ...data,
                    age,
                    gender: data.gender || undefined,
                    preferred_topics: data.preferred_topics || []
                };

                // Sync with local storage for active child
                if (typeof window !== 'undefined') {
                    localStorage.setItem('bookok_active_child_id', String(data.id));
                }

                await refreshChildren();
                toast.success(`${name}의 프로필이 등록되었습니다! 🎉 맞춤 추천을 시작합니다.`);
                onSuccess?.(newChild);
                onClose();
            }
        } catch (err: any) {
            console.error("Unexpected error saving child:", err);
            toast.error("오류가 발생했습니다: " + (err?.message || "다시 시도해주세요."));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
            <div className="bg-white rounded-[36px] w-full max-w-md p-6 sm:p-8 shadow-2xl relative animate-in zoom-in-95 duration-200 flex flex-col my-auto border border-gray-100 max-h-[92vh] overflow-y-auto scrollbar-hide">
                
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 p-2 bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-gray-700 rounded-full transition-colors z-10 active:scale-95"
                >
                    <X size={18} />
                </button>

                {/* STEP 0: Prompt / Invitation */}
                {step === 'prompt' && (
                    <div className="flex flex-col items-center text-center py-2">
                        {/* Illustration */}
                        <div className="relative w-32 h-28 mb-4">
                            <Image
                                src="/images/hero_child_reading_3d.png"
                                alt="아이 독서 일러스트"
                                fill
                                className="object-contain"
                                sizes="128px"
                                priority
                            />
                        </div>

                        <span className="text-[11px] font-black text-[#16A34A] bg-green-50 border border-green-200/60 px-3.5 py-1 rounded-full uppercase tracking-wider mb-2">
                            Welcome to Book,ok
                        </span>

                        <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight mb-2 leading-snug break-keep">
                            우리 아이를 위한<br />맞춤 독서 여정을 시작할까요?
                        </h2>

                        <p className="text-xs sm:text-sm text-gray-500 font-medium leading-relaxed mb-6 break-keep max-w-xs">
                            아이의 연령과 관심 주제에 딱 맞는<br />
                            <strong>도서관 인기 도서 추천</strong>과 <strong>독서 솔루션</strong>을 제공해드려요.
                        </p>

                        {/* Value proposition badges */}
                        <div className="w-full bg-[#F8FAF9] border border-gray-150/80 rounded-2xl p-3.5 mb-6 text-left space-y-2">
                            <div className="flex items-center gap-2.5 text-xs font-bold text-gray-700">
                                <div className="w-5 h-5 rounded-full bg-green-100 text-[#16A34A] flex items-center justify-center shrink-0">
                                    <Sparkles size={12} />
                                </div>
                                <span>연령별 & 성향별 실시간 도서 큐레이션</span>
                            </div>
                            <div className="flex items-center gap-2.5 text-xs font-bold text-gray-700">
                                <div className="w-5 h-5 rounded-full bg-green-100 text-[#16A34A] flex items-center justify-center shrink-0">
                                    <ShieldCheck size={12} />
                                </div>
                                <span>국립중앙도서관 빅데이터 인기 대출 도서 연동</span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="w-full space-y-2.5">
                            <button
                                onClick={() => setStep('info')}
                                className="w-full bg-[#16A34A] hover:bg-green-700 text-white font-black py-4 rounded-2xl text-sm transition-all shadow-md shadow-green-600/15 active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                <span>네, 자녀 프로필 만들게요</span>
                                <span className="text-base">🚀</span>
                            </button>

                            <button
                                onClick={onClose}
                                className="w-full py-3 text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                다음에 만들게요
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 1: Basic Info */}
                {step === 'info' && (
                    <div className="flex flex-col py-1">
                        {/* Header & Step progress */}
                        <div className="flex items-center justify-between mb-4">
                            <button
                                onClick={() => setStep('prompt')}
                                className="p-1 text-gray-400 hover:text-gray-700 transition-colors"
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <span className="text-xs font-black text-[#16A34A] bg-green-50 px-2.5 py-0.5 rounded-full">
                                Step 1 / 2
                            </span>
                        </div>

                        <h3 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight mb-1">
                            아이의 기본 정보를 알려주세요 👶
                        </h3>
                        <p className="text-xs text-gray-400 font-medium mb-5">
                            연령대에 꼭 맞는 맞춤 추천을 위해 필요한 정보예요.
                        </p>

                        <div className="space-y-4 mb-6">
                            {/* Child Name */}
                            <div>
                                <label className="block text-xs font-black text-gray-700 mb-1.5 ml-0.5">
                                    아이 이름 또는 애칭 <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="예: 민준이, 별이"
                                        className="w-full bg-gray-50 border border-gray-150 rounded-2xl py-3.5 pl-11 pr-4 text-sm font-bold text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A] transition-all"
                                    />
                                </div>
                            </div>

                            {/* Child Birthdate */}
                            <div>
                                <label className="block text-xs font-black text-gray-700 mb-1.5 ml-0.5">
                                    생년월일 <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="date"
                                        value={birthdate}
                                        max={new Date().toISOString().split("T")[0]}
                                        onChange={(e) => setBirthdate(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-150 rounded-2xl py-3.5 pl-11 pr-4 text-sm font-bold text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A] transition-all"
                                    />
                                </div>
                                {birthdate && (
                                    <div className="mt-2 ml-1 text-xs font-bold text-[#16A34A]">
                                        ✨ {calculateAgeAndType(birthdate).age}세 / {calculateAgeAndType(birthdate).typeText} 단계로 매칭됩니다.
                                    </div>
                                )}
                            </div>

                            {/* Gender selection */}
                            <div>
                                <label className="block text-xs font-black text-gray-700 mb-1.5 ml-0.5">
                                    성별 (선택)
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {["남아", "여아", "선택안함"].map((g) => (
                                        <button
                                            key={g}
                                            type="button"
                                            onClick={() => setGender(g)}
                                            className={`py-3 rounded-2xl text-xs font-bold transition-all border ${
                                                gender === g
                                                    ? "bg-[#1A1A1A] border-[#1A1A1A] text-white font-black shadow-sm"
                                                    : "bg-gray-50 border-gray-150 text-gray-500 hover:bg-gray-100"
                                            }`}
                                        >
                                            {g === "남아" ? "👦 남아" : g === "여아" ? "👧 여아" : "선택안함"}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Next Button */}
                        <button
                            onClick={() => {
                                if (!name.trim()) {
                                    toast.error("아이 이름을 입력해주세요.");
                                    return;
                                }
                                if (!birthdate) {
                                    toast.error("아이 생년월일을 선택해주세요.");
                                    return;
                                }
                                setStep('preferences');
                            }}
                            disabled={!name.trim() || !birthdate}
                            className="w-full bg-[#16A34A] hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-black py-4 rounded-2xl text-sm transition-all shadow-md shadow-green-600/15 active:scale-[0.98]"
                        >
                            다음 (선호 주제 선택) ➔
                        </button>
                    </div>
                )}

                {/* STEP 2: Topic Preferences */}
                {step === 'preferences' && (
                    <div className="flex flex-col py-1">
                        {/* Header & Step progress */}
                        <div className="flex items-center justify-between mb-3">
                            <button
                                onClick={() => setStep('info')}
                                className="p-1 text-gray-400 hover:text-gray-700 transition-colors"
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <span className="text-xs font-black text-[#16A34A] bg-green-50 px-2.5 py-0.5 rounded-full">
                                Step 2 / 2
                            </span>
                        </div>

                        <div className="flex items-start justify-between gap-2 mb-1">
                            <h3 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight leading-snug">
                                {name || "아이"}가 어떤 주제의<br />책을 좋아하나요? 📚
                            </h3>
                            <span className={`text-[11px] font-black px-2.5 py-1 rounded-full whitespace-nowrap mt-1 ${
                                selectedTopics.length > 0
                                    ? "bg-green-100 text-green-800"
                                    : "bg-gray-100 text-gray-400"
                            }`}>
                                {selectedTopics.length} / 3개 선택됨
                            </span>
                        </div>

                        <p className="text-xs text-gray-400 font-medium mb-4">
                            알라딘 도서 분류 기준 선호 주제를 최대 3개까지 골라주세요.
                        </p>

                        {/* 8 Categories Grid */}
                        <div className="grid grid-cols-2 gap-2.5 mb-5 max-h-[280px] overflow-y-auto pr-1">
                            {ALADIN_TOPIC_CATEGORIES.map((cat) => {
                                const isSelected = selectedTopics.includes(cat.label);
                                return (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => handleTopicToggle(cat.label)}
                                        className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between min-h-[72px] active:scale-95 ${
                                            isSelected
                                                ? "bg-green-50/80 border-[#16A34A] text-green-900 ring-1 ring-[#16A34A]/30 shadow-sm"
                                                : "bg-gray-50/60 border-gray-150 text-gray-700 hover:bg-gray-100"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-lg">{cat.icon}</span>
                                            {isSelected && (
                                                <div className="w-4 h-4 rounded-full bg-[#16A34A] text-white flex items-center justify-center">
                                                    <Check size={10} strokeWidth={3} />
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-black tracking-tight">{cat.label}</h4>
                                            <p className="text-[9.5px] text-gray-400 font-medium line-clamp-1 mt-0.5">{cat.description}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-2">
                            <button
                                onClick={() => handleSaveChildProfile(false)}
                                disabled={isSubmitting}
                                className="w-full bg-[#16A34A] hover:bg-green-700 disabled:opacity-50 text-white font-black py-4 rounded-2xl text-sm transition-all shadow-md shadow-green-600/15 active:scale-[0.98] flex items-center justify-center gap-1.5"
                            >
                                {isSubmitting ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <span>맞춤 추천 시작하기</span>
                                        <Sparkles size={16} />
                                    </>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => handleSaveChildProfile(true)}
                                disabled={isSubmitting}
                                className="w-full py-2.5 text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors text-center"
                            >
                                나중에 선택할게요
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

