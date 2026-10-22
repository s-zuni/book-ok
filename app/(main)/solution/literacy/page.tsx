"use client";

import { useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Clock } from "lucide-react";
import { useAuth } from "@features/auth/AuthContext";
import { Child, LiteracyAssessment } from "@shared/types";
import { getGradeConfig, recommendGrade } from "@features/literacy/scoring";
import { clearLiteracyProgress, useLiteracyTest } from "@features/literacy/useLiteracyTest";
import LiteracyReportView from "@widgets/solution/LiteracyReportView";
import LiteracyPassageStep from "@widgets/solution/LiteracyPassageStep";
import LiteracyQuizStep from "@widgets/solution/LiteracyQuizStep";
import LoadingState from "@shared/ui/LoadingState";

const CONSULT_CONTEXT_KEY = "bookok_literacy_consult_context";

function formatTime(sec: number) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function LiteracyTestPageInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const gradeParam = searchParams?.get("grade");
    const childIdParam = searchParams?.get("childId");

    const { children, isInitialized } = useAuth();
    const [confirmExit, setConfirmExit] = useState(false);

    // 활성 자녀: 쿼리 → 저장된 선택 → 첫 번째 자녀 순
    const activeChild = useMemo<Child | null>(() => {
        if (!isInitialized || children.length === 0) return null;
        let targetId: string | null = childIdParam;
        if (!targetId) {
            try {
                targetId = localStorage.getItem("bookok_active_child_id");
            } catch {
                targetId = null;
            }
        }
        const matched = targetId ? children.find((c) => String(c.id) === String(targetId)) : null;
        return matched || children[0];
    }, [isInitialized, children, childIdParam]);

    const targetGrade =
        gradeParam !== null && !Number.isNaN(Number(gradeParam))
            ? Math.min(Math.max(Number(gradeParam), 0), 6)
            : recommendGrade(activeChild).grade;

    // 자녀 목록이 있으면 activeChild가 정해진 뒤에 한 번만 불러온다 (중복 지문 호출 방지)
    const childReady = children.length === 0 || activeChild !== null;

    const test = useLiteracyTest({
        activeChild,
        targetGrade,
        ready: isInitialized && childReady,
        onLoadFailed: () => router.push("/solution?tab=literacy"),
    });

    const leave = () => {
        clearLiteracyProgress();
        router.push("/solution?tab=literacy");
    };

    // 진행 중에는 확인 후 나가고, 결과 화면에서는 바로 나간다
    const handleExit = () => {
        if (test.step === "reading" || test.step === "quiz") setConfirmExit(true);
        else leave();
    };

    const handleConsultAI = (assessment: LiteracyAssessment) => {
        try {
            sessionStorage.setItem(
                CONSULT_CONTEXT_KEY,
                JSON.stringify({
                    total_bli_score: assessment.total_bli_score,
                    bli_tier: assessment.bli_tier,
                    weakest_area_label: assessment.weakest_area_label,
                    strength_area_label: assessment.strength_area_label,
                    effective_wpm: assessment.effective_wpm,
                    grade_label: assessment.grade_label,
                    passage_title: assessment.passage_title,
                })
            );
        } catch {
            // 저장소를 쓸 수 없어도 상담 화면으로는 이동한다
        }
        router.push("/solution?tab=solution&fromLiteracy=1");
    };

    const gradeConfig = getGradeConfig(test.passage?.grade_level ?? targetGrade);

    return (
        <div className="min-h-screen bg-[#FDFDFD] text-[#1A1A1A] flex flex-col pb-12">
            <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 px-4 lg:px-8 pb-3.5 pt-[calc(0.875rem+env(safe-area-inset-top,0px))]">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <button
                        type="button"
                        onClick={handleExit}
                        className="flex items-center gap-1.5 text-sm font-extrabold text-gray-700 hover:text-[#2E5A44] transition-colors py-1"
                    >
                        <ArrowLeft size={18} />
                        <span>진단 나가기</span>
                    </button>

                    <div className="flex items-center gap-2">
                        <span className="text-xs font-black bg-[#E8F5E9] text-[#2E5A44] px-3 py-1 rounded-full">
                            {activeChild ? `${activeChild.name} · ` : ""}
                            {gradeConfig.shortLabel}
                        </span>
                        {test.step === "reading" && (
                            <span className="inline-flex items-center gap-1 bg-gray-900 text-white text-xs font-extrabold px-3 py-1 rounded-full">
                                <Clock size={12} />
                                {formatTime(test.readingSeconds)}
                            </span>
                        )}
                        {test.step === "quiz" && (
                            <span className="inline-flex items-center gap-1 bg-[#2E5A44] text-white text-xs font-extrabold px-3 py-1 rounded-full">
                                문항 {test.currentQIdx + 1} / {test.questions.length}
                            </span>
                        )}
                    </div>
                </div>
            </header>

            {confirmExit && (
                <div
                    role="alertdialog"
                    aria-modal="true"
                    aria-labelledby="literacy-exit-title"
                    className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6"
                >
                    <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-xl">
                        <h2 id="literacy-exit-title" className="text-base font-black text-[#1A1A1A]">
                            진단을 그만둘까요?
                        </h2>
                        <p className="text-sm text-gray-600 font-medium leading-relaxed">
                            지금까지 읽은 시간과 고른 답이 사라져요.
                        </p>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setConfirmExit(false)}
                                className="flex-1 py-3 rounded-2xl bg-[#16A34A] text-white text-sm font-black"
                            >
                                계속하기
                            </button>
                            <button
                                type="button"
                                onClick={leave}
                                className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-700 text-sm font-extrabold"
                            >
                                나가기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 pt-6">
                {test.step === "loading" && (
                    <div className="bg-white rounded-[32px] border border-gray-100 p-10 shadow-xs min-h-[420px] flex flex-col items-center justify-center">
                        <LoadingState
                            messages={[
                                `${gradeConfig.label} 수준에 맞는 지문을 불러오고 있어요...`,
                                "4가지 영역의 문항을 준비하고 있어요...",
                            ]}
                        />
                    </div>
                )}

                {test.step === "submitting" && (
                    <div className="bg-white rounded-[32px] border border-gray-100 p-10 shadow-xs min-h-[420px] flex flex-col items-center justify-center">
                        <LoadingState
                            messages={[
                                "정답을 확인하고 영역별 결과를 정리하고 있어요...",
                                "함께 읽어 볼 만한 도서를 찾고 있어요...",
                            ]}
                        />
                    </div>
                )}

                {test.step === "reading" && test.passage && (
                    <LiteracyPassageStep
                        passage={test.passage}
                        gradeConfig={gradeConfig}
                        readingTimeLabel={formatTime(test.readingSeconds)}
                        onFinish={test.handleFinishReading}
                    />
                )}

                {test.step === "quiz" && test.passage && test.currentQuestion && (
                    <LiteracyQuizStep
                        // 문항이 바뀔 때마다 '지문 다시 보기' 펼침 상태를 초기화한다
                        key={test.currentQuestion.id}
                        passage={test.passage}
                        question={test.currentQuestion}
                        questionIndex={test.currentQIdx}
                        questionCount={test.questions.length}
                        selected={test.selectedOptions[test.currentQuestion.id]}
                        onSelect={test.handleSelectOption}
                        onMove={test.goToQuestion}
                        onSubmit={test.handleSubmitQuiz}
                    />
                )}

                {test.step === "report" && test.assessmentResult && (
                    <LiteracyReportView
                        assessment={test.assessmentResult}
                        child={activeChild}
                        onRetake={test.retake}
                        onConsultAI={handleConsultAI}
                    />
                )}
            </main>
        </div>
    );
}

export default function LiteracyTestPage() {
    return (
        <Suspense fallback={null}>
            <LiteracyTestPageInner />
        </Suspense>
    );
}
