"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Sparkles,
    BookOpenCheck,
    Play,
    ShieldCheck,
    History,
    CheckCircle2,
    BrainCircuit,
} from "lucide-react";
import { Child, LiteracyAssessment } from "@shared/types";
import {
    GRADE_LEVEL_OPTIONS,
    mapChildToDefaultGrade,
    getGradeConfig,
} from "@features/literacy/scoring";
import { fetchChildLiteracyHistory } from "@features/literacy/api";
import LiteracyReportView from "./LiteracyReportView";

interface LiteracyDashboardWidgetProps {
    activeChild: Child | null;
    onConsultWithAssessment?: (assessment: LiteracyAssessment) => void;
}

export default function LiteracyDashboardWidget({
    activeChild,
    onConsultWithAssessment,
}: LiteracyDashboardWidgetProps) {
    const router = useRouter();
    const [selectedGrade, setSelectedGrade] = useState<number>(() =>
        mapChildToDefaultGrade(activeChild)
    );
    const [history, setHistory] = useState<LiteracyAssessment[]>([]);
    const [selectedAssessmentIdx, setSelectedAssessmentIdx] = useState(0);
    const [loadingHistory, setLoadingHistory] = useState(false);

    useEffect(() => {
        setSelectedGrade(mapChildToDefaultGrade(activeChild));
    }, [activeChild?.id, activeChild?.age, activeChild?.birthdate]);

    useEffect(() => {
        let mounted = true;
        const loadHistory = async () => {
            if (!activeChild?.id) {
                setHistory([]);
                return;
            }
            setLoadingHistory(true);
            try {
                const items = await fetchChildLiteracyHistory(activeChild.id);
                if (mounted) {
                    setHistory(items);
                    setSelectedAssessmentIdx(0);
                }
            } finally {
                if (mounted) setLoadingHistory(false);
            }
        };
        loadHistory();
        return () => {
            mounted = false;
        };
    }, [activeChild?.id]);

    const currentGradeConfig = getGradeConfig(selectedGrade);
    const currentAssessment = history[selectedAssessmentIdx] || null;
    const childName = activeChild ? activeChild.name : "우리 아이";

    const handleStartTest = () => {
        const params = new URLSearchParams();
        params.set("grade", String(selectedGrade));
        if (activeChild?.id) params.set("childId", String(activeChild.id));
        router.push(`/solution/literacy?${params.toString()}`);
    };

    return (
        <div className="space-y-6 pb-16">
            {/* 1. Start Test Launcher Card */}
            <div className="bg-white rounded-[32px] border border-gray-100 p-6 lg:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 bg-[#E8F5E9] text-[#2E5A44] text-xs font-extrabold px-3 py-1 rounded-full">
                        <BrainCircuit size={14} className="text-[#16A34A]" />
                        공공 검증 코퍼스 · LangChain RAG 문해력 엔진
                    </span>
                    <span className="text-xs font-bold text-gray-400">소요 시간 약 3분 · 총 4문항</span>
                </div>

                <h2 className="text-xl lg:text-3xl font-black text-[#1A1A1A] tracking-tight mb-2 break-keep">
                    {childName} 맞춤 <span className="text-[#16A34A]">AI 문해력 진단 (BLI)</span> 및 도서 처방
                </h2>
                <p className="text-xs lg:text-sm text-gray-500 font-medium leading-relaxed mb-6 break-keep">
                    학년 수준에 맞춘 지문을 읽고 <strong>어휘력 · 사실적 이해 · 추론적 이해 · 비판적 이해 · 읽기 유창성(WPM)</strong> 5대 영역을 정밀 측정한 뒤, 부족한 영역을 채워줄 맞춤 도서를 즉시 처방해 드립니다.
                </p>

                {/* Grade Selector (Grade 0 ~ Grade 6) */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2.5">
                        <label className="text-xs font-extrabold text-gray-700">
                            진단 단계 선택{" "}
                            {activeChild && (
                                <span className="text-[#16A34A] ml-1">
                                    (현재 {activeChild.name} 나이에 맞춰 자동 추천되었어요)
                                </span>
                            )}
                        </label>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                        {GRADE_LEVEL_OPTIONS.map((opt) => {
                            const isSelected = selectedGrade === opt.grade;
                            return (
                                <button
                                    key={opt.grade}
                                    type="button"
                                    onClick={() => setSelectedGrade(opt.grade)}
                                    className={`p-3 rounded-2xl border text-left transition-all active:scale-95 ${
                                        isSelected
                                            ? "bg-[#2E5A44] text-white border-[#2E5A44] shadow-md"
                                            : "bg-[#F9FAFB] text-gray-700 border-gray-100 hover:bg-gray-100"
                                    }`}
                                >
                                    <div className="text-xs font-black">{opt.shortLabel}</div>
                                    <div
                                        className={`text-[10px] font-bold mt-0.5 ${
                                            isSelected ? "text-emerald-200" : "text-gray-400"
                                        }`}
                                    >
                                        {opt.ageRange}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Selected Grade Info Strip */}
                    <div className="mt-3 bg-[#F9FAFB] border border-gray-100 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                            <CheckCircle2 size={16} className="text-[#16A34A] shrink-0" />
                            <span>
                                <strong>{currentGradeConfig.label}</strong>: {currentGradeConfig.description}
                            </span>
                        </div>
                        {currentGradeConfig.isParentGuided && (
                            <span className="text-[11px] font-extrabold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full">
                                👨‍👩‍👧 부모님과 함께 읽기 권장
                            </span>
                        )}
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleStartTest}
                    className="w-full bg-[#16A34A] hover:bg-green-700 text-white font-black py-4 lg:py-5 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-base active:scale-[0.99]"
                >
                    <Play size={18} fill="currentColor" />
                    {currentGradeConfig.shortLabel} 문해력 진단 시작하기
                </button>
            </div>

            {/* 2. Past Assessment History & Latest 5-Axis Report */}
            {loadingHistory ? (
                <div className="bg-white rounded-[32px] border border-gray-100 p-8 text-center animate-pulse space-y-3">
                    <div className="h-6 bg-gray-200 rounded w-1/3 mx-auto" />
                    <div className="h-48 bg-gray-100 rounded-2xl" />
                </div>
            ) : currentAssessment ? (
                <div className="space-y-4">
                    {history.length > 1 && (
                        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
                            <span className="text-xs font-extrabold text-gray-500 flex items-center gap-1 shrink-0 mr-1">
                                <History size={14} /> 진단 이력:
                            </span>
                            {history.map((item, idx) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => setSelectedAssessmentIdx(idx)}
                                    className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap transition-all ${
                                        selectedAssessmentIdx === idx
                                            ? "bg-[#1A1A1A] text-white shadow-xs"
                                            : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
                                    }`}
                                >
                                    {new Date(item.created_at).toLocaleDateString("ko-KR", {
                                        month: "short",
                                        day: "numeric",
                                    })}{" "}
                                    · {item.total_bli_score}점
                                </button>
                            ))}
                        </div>
                    )}

                    <LiteracyReportView
                        assessment={currentAssessment}
                        child={activeChild}
                        onRetake={handleStartTest}
                        onConsultAI={onConsultWithAssessment}
                    />
                </div>
            ) : (
                <div className="bg-white rounded-[32px] border border-dashed border-gray-200 p-8 text-center space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#16A34A] flex items-center justify-center mx-auto mb-2">
                        <BookOpenCheck size={24} />
                    </div>
                    <h4 className="font-extrabold text-base text-gray-800">
                        아직 {childName}의 문해력 진단 기록이 없어요
                    </h4>
                    <p className="text-xs text-gray-400 font-medium max-w-md mx-auto leading-relaxed">
                        위에서 학년 단계를 선택하고 3분 문해력 진단을 완료하면, 5각형 BLI 문해력 차트와 약점 보완 맞춤 처방 도서가 이곳에 표시됩니다.
                    </p>
                </div>
            )}
        </div>
    );
}

