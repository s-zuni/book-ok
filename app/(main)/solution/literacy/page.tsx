"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    ArrowLeft,
    BookOpen,
    Clock,
    Sparkles,
    CheckCircle2,
    ChevronRight,
    ChevronLeft,
    Eye,
    EyeOff,
    Type,
    ShieldCheck,
} from "lucide-react";
import { useAuth } from "@features/auth/AuthContext";
import { Child, LiteracyAssessment, LiteracyPassage, LiteracyQuestion } from "@shared/types";
import {
    AREA_METADATA,
    getGradeConfig,
    mapChildToDefaultGrade,
} from "@features/literacy/scoring";
import {
    startLiteracyTest,
    submitLiteracyTest,
    SubmitLiteracyAnswerItem,
} from "@features/literacy/api";
import LiteracyReportView from "@widgets/solution/LiteracyReportView";
import LoadingState from "@shared/ui/LoadingState";
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { toast } from "sonner";

type TestStep = "loading" | "reading" | "quiz" | "submitting" | "report";

const PROGRESS_KEY = "bookok_literacy_progress";
const LARGE_FONT_KEY = "bookok_literacy_large_font";
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

interface SavedProgress {
    childId: string | null;
    grade: number;
    passage: LiteracyPassage;
    questions: LiteracyQuestion[];
    sessionToken?: string;
    step: "reading" | "quiz";
    readingSeconds: number;
    currentQIdx: number;
    selectedOptions: Record<string, number>;
    questionTimes: Record<string, number>;
}

function readProgress(): SavedProgress | null {
    try {
        const raw = sessionStorage.getItem(PROGRESS_KEY);
        return raw ? (JSON.parse(raw) as SavedProgress) : null;
    } catch {
        return null;
    }
}

function clearProgress() {
    try {
        sessionStorage.removeItem(PROGRESS_KEY);
    } catch {
        // 저장소를 쓸 수 없는 환경에서는 무시
    }
}

/** 서버 세션 토큰(passageId|user|issuedAt|sig)의 발급 시각이 유효 기간 안인지 확인 */
function isTokenFresh(token?: string): boolean {
    const issuedAt = Number(token?.split("|")[2]);
    return Number.isFinite(issuedAt) && Date.now() - issuedAt < SESSION_TTL_MS - 5 * 60 * 1000;
}

function LiteracyTestPageInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const gradeParam = searchParams?.get("grade");
    const childIdParam = searchParams?.get("childId");

    const { children, isInitialized } = useAuth();
    const [activeChild, setActiveChild] = useState<Child | null>(null);

    const [step, setStep] = useState<TestStep>("loading");
    const [passage, setPassage] = useState<LiteracyPassage | null>(null);
    const [questions, setQuestions] = useState<LiteracyQuestion[]>([]);
    const [sessionToken, setSessionToken] = useState<string | undefined>(undefined);
    const [largeFont, setLargeFont] = useState(false);

    // Reading timer states
    const [readingSeconds, setReadingSeconds] = useState(0);
    const [skimWarned, setSkimWarned] = useState(false);
    const readingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Quiz states
    const [currentQIdx, setCurrentQIdx] = useState(0);
    const [selectedOptions, setSelectedOptions] = useState<Record<string, number>>({});
    const [questionTimes, setQuestionTimes] = useState<Record<string, number>>({});
    const [showPassageDrawer, setShowPassageDrawer] = useState(false);
    const questionStartRef = useRef<number>(Date.now());

    // Final Assessment Result
    const [assessmentResult, setAssessmentResult] = useState<LiteracyAssessment | null>(null);

    // Sync active child
    useEffect(() => {
        if (!isInitialized) return;
        if (children.length > 0) {
            const targetId =
                childIdParam ||
                (typeof window !== "undefined"
                    ? localStorage.getItem("bookok_active_child_id")
                    : null);
            const matched = targetId
                ? children.find((c) => String(c.id) === String(targetId))
                : null;
            setActiveChild(matched || children[0]);
        }
    }, [isInitialized, children, childIdParam]);

    const targetGrade =
        gradeParam !== null && !Number.isNaN(Number(gradeParam))
            ? Math.min(Math.max(Number(gradeParam), 0), 6)
            : mapChildToDefaultGrade(activeChild);

    const loadTestSession = async (overrideGrade?: number, forceNew = false) => {
        // 새로고침·앱 전환으로 끊긴 진행 중 진단 복원
        const effective = typeof overrideGrade === "number" ? overrideGrade : targetGrade;
        const saved = forceNew ? null : readProgress();
        if (
            saved &&
            saved.grade === effective &&
            saved.childId === (activeChild?.id != null ? String(activeChild.id) : null) &&
            isTokenFresh(saved.sessionToken)
        ) {
            setPassage(saved.passage);
            setQuestions(saved.questions);
            setSessionToken(saved.sessionToken);
            setReadingSeconds(saved.readingSeconds);
            setCurrentQIdx(Math.min(saved.currentQIdx, saved.questions.length - 1));
            setSelectedOptions(saved.selectedOptions);
            setQuestionTimes(saved.questionTimes);
            setSkimWarned(false);
            setShowPassageDrawer(false);
            setAssessmentResult(null);
            questionStartRef.current = Date.now();
            setStep(saved.step);
            return;
        }
        clearProgress();

        setStep("loading");
        setReadingSeconds(0);
        setSkimWarned(false);
        setCurrentQIdx(0);
        setSelectedOptions({});
        setQuestionTimes({});
        setShowPassageDrawer(false);
        setAssessmentResult(null);

        try {
            const effectiveGrade =
                typeof overrideGrade === "number" ? overrideGrade : targetGrade;
            const res = await startLiteracyTest({
                childId: activeChild?.id,
                childAge: activeChild?.age,
                gradeLevel: effectiveGrade,
                preferredTopics: activeChild?.preferred_topics || [],
            });
            setPassage(res.passage);
            setQuestions(res.questions);
            setSessionToken(res.session_token);
            setStep("reading");
        } catch (err) {
            toast.error(err instanceof Error && err.message ? err.message : "진단 문항을 불러오는 중 오류가 발생했습니다.");
            router.push("/solution?tab=literacy");
        }
    };

    // 자녀 목록이 있는 경우 activeChild가 정해진 뒤에 한 번만 불러온다 (중복 지문 호출 방지)
    const childReady = children.length === 0 || activeChild !== null;

    useEffect(() => {
        if (!isInitialized || !childReady) return;
        loadTestSession(targetGrade);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isInitialized, childReady, activeChild?.id, gradeParam]);

    // Manage reading timer
    useEffect(() => {
        if (step === "reading") {
            readingTimerRef.current = setInterval(() => {
                setReadingSeconds((prev) => prev + 1);
            }, 1000);
        } else if (readingTimerRef.current) {
            clearInterval(readingTimerRef.current);
            readingTimerRef.current = null;
        }
        return () => {
            if (readingTimerRef.current) {
                clearInterval(readingTimerRef.current);
            }
        };
    }, [step]);

    // 진행 상태 저장 (읽기/문항 단계에서만)
    useEffect(() => {
        if ((step !== "reading" && step !== "quiz") || !passage) return;
        try {
            const progress: SavedProgress = {
                childId: activeChild?.id != null ? String(activeChild.id) : null,
                grade: targetGrade,
                passage,
                questions,
                sessionToken,
                step,
                readingSeconds,
                currentQIdx,
                selectedOptions,
                questionTimes,
            };
            sessionStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
        } catch {
            // 저장 실패는 진단 진행에 영향을 주지 않는다
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step, passage, questions, sessionToken, readingSeconds, currentQIdx, selectedOptions, questionTimes]);

    // 큰 글자 설정 기억
    useEffect(() => {
        try {
            setLargeFont(localStorage.getItem(LARGE_FONT_KEY) === "1");
        } catch {
            // ignore
        }
    }, []);

    const toggleLargeFont = () => {
        setLargeFont((prev) => {
            try {
                localStorage.setItem(LARGE_FONT_KEY, prev ? "0" : "1");
            } catch {
                // ignore
            }
            return !prev;
        });
    };

    // 앱이 백그라운드로 가거나 탭이 숨겨진 동안은 읽기 시간을 세지 않는다
    useEffect(() => {
        if (step !== "reading") return;
        const onVisibility = () => {
            if (document.hidden) {
                if (readingTimerRef.current) {
                    clearInterval(readingTimerRef.current);
                    readingTimerRef.current = null;
                }
            } else if (!readingTimerRef.current) {
                readingTimerRef.current = setInterval(() => setReadingSeconds((p) => p + 1), 1000);
            }
        };
        document.addEventListener("visibilitychange", onVisibility);
        return () => document.removeEventListener("visibilitychange", onVisibility);
    }, [step]);

    // Track per-question time start
    useEffect(() => {
        if (step === "quiz") {
            questionStartRef.current = Date.now();
        }
    }, [step, currentQIdx]);

    const formatTime = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    };

    const handleFinishReading = async () => {
        if (Capacitor.isNativePlatform()) {
            await Haptics.impact({ style: ImpactStyle.Medium });
        }

        // Anti-skimming check: if less than 6 seconds on first click, show gentle nudge
        if (readingSeconds < 6 && !skimWarned) {
            setSkimWarned(true);
            toast.info("지문을 조금만 더 꼼꼼히 읽고 문제를 풀어볼까요? 한 번 더 누르면 문제로 넘어갑니다.");
            return;
        }

        setStep("quiz");
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleSelectOption = (questionId: string, optionIdx: number) => {
        if (Capacitor.isNativePlatform()) {
            void Haptics.impact({ style: ImpactStyle.Light });
        }
        setSelectedOptions((prev) => ({ ...prev, [questionId]: optionIdx }));
    };

    // 문항을 떠날 때(이전/다음/제출) 그 문항에서 보낸 시간을 한 번만 누적한다
    const commitQuestionTime = (questionId: string): Record<string, number> => {
        const elapsedSec = Math.max(
            Math.round((Date.now() - questionStartRef.current) / 1000),
            2
        );
        questionStartRef.current = Date.now();
        const next = {
            ...questionTimes,
            [questionId]: (questionTimes[questionId] || 0) + elapsedSec,
        };
        setQuestionTimes(next);
        return next;
    };

    const goToQuestion = (delta: number) => {
        if (currentQuestion) commitQuestionTime(currentQuestion.id);
        setCurrentQIdx((prev) => Math.min(Math.max(prev + delta, 0), questions.length - 1));
    };

    const handleSubmitQuiz = async () => {
        if (!passage) return;
        const finalTimes = currentQuestion ? commitQuestionTime(currentQuestion.id) : questionTimes;
        if (Capacitor.isNativePlatform()) {
            await Haptics.impact({ style: ImpactStyle.Medium });
        }

        setStep("submitting");
        try {
            const answersPayload: SubmitLiteracyAnswerItem[] = questions.map((q) => ({
                question_id: q.id,
                area: q.area,
                selected:
                    typeof selectedOptions[q.id] === "number" ? selectedOptions[q.id] : -1,
                time_spent_sec: finalTimes[q.id] || 12,
            }));

            const result = await submitLiteracyTest({
                childId: activeChild?.id || null,
                childName: activeChild?.name || "우리 아이",
                passageId: passage.id,
                sessionToken,
                gradeLevel: passage.grade_level,
                readingTimeSeconds: Math.max(readingSeconds, 8),
                answers: answersPayload,
                preferredTopics: activeChild?.preferred_topics || [],
            });

            clearProgress();
            setAssessmentResult(result);
            setStep("report");
            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (err) {
            toast.error(err instanceof Error && err.message ? err.message : "채점 중 오류가 발생했습니다.");
            setStep("quiz");
        }
    };

    const handleConsultAI = (assessment: LiteracyAssessment) => {
        if (typeof window !== "undefined") {
            sessionStorage.setItem(
                "bookok_literacy_consult_context",
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
        }
        router.push("/solution?tab=solution&fromLiteracy=1");
    };

    const currentQuestion = questions[currentQIdx];
    const gradeConfig = getGradeConfig(passage?.grade_level ?? targetGrade);

    return (
        <div className="min-h-screen bg-[#FDFDFD] text-[#1A1A1A] flex flex-col pb-12">
            {/* Top Sticky Navigation Bar */}
            <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 px-4 lg:px-8 pb-3.5 pt-[calc(0.875rem+env(safe-area-inset-top,0px))]">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <button
                        type="button"
                        onClick={() => {
                            clearProgress();
                            router.push("/solution?tab=literacy");
                        }}
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
                        {step === "reading" && (
                            <span className="inline-flex items-center gap-1 bg-gray-900 text-white text-xs font-extrabold px-3 py-1 rounded-full">
                                <Clock size={12} />
                                {formatTime(readingSeconds)}
                            </span>
                        )}
                        {step === "quiz" && (
                            <span className="inline-flex items-center gap-1 bg-[#2E5A44] text-white text-xs font-extrabold px-3 py-1 rounded-full">
                                문항 {currentQIdx + 1} / {questions.length}
                            </span>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content Container */}
            <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 pt-6">
                {step === "loading" && (
                    <div className="bg-white rounded-[32px] border border-gray-100 p-10 shadow-xs min-h-[420px] flex flex-col items-center justify-center">
                        <LoadingState
                            messages={[
                                `${gradeConfig.label} 수준에 맞는 지문을 불러오고 있어요...`,
                                "4대 문해력 문항을 준비하고 있어요...",
                            ]}
                        />
                    </div>
                )}

                {step === "submitting" && (
                    <div className="bg-white rounded-[32px] border border-gray-100 p-10 shadow-xs min-h-[420px] flex flex-col items-center justify-center">
                        <LoadingState
                            messages={[
                                "5각형 문해력 지수(BLI)와 유효 읽기 속도(WPM)를 분석하고 있어요...",
                                "약점 영역을 보완할 맞춤 처방 도서 3권을 매칭하고 있어요...",
                            ]}
                        />
                    </div>
                )}

                {/* ================= STEP 1: PASSAGE READING ================= */}
                {step === "reading" && passage && (
                    <div className="space-y-5 animate-in fade-in duration-300">
                        {/* Guide Banner */}
                        <div className="bg-emerald-50/80 border border-emerald-100 rounded-2xl p-4 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-[#2E5A44] text-white flex items-center justify-center shrink-0">
                                    <BookOpen size={18} />
                                </div>
                                <div>
                                    <p className="text-xs lg:text-sm font-extrabold text-[#2E5A44]">
                                        {gradeConfig.isParentGuided
                                            ? "👨‍👩‍👧 부모님과 함께 소리 내어 읽으며 내용을 떠올려 보세요!"
                                            : "📖 내용을 생각하며 끝까지 차분하게 읽어 보세요!"}
                                    </p>
                                    <p className="text-[11px] text-emerald-700/80 font-medium">
                                        다 읽은 뒤 아래 [다 읽었어요] 버튼을 누르면 읽기 유창성(WPM)이 자동 측정됩니다.
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={toggleLargeFont}
                                aria-pressed={largeFont}
                                className="shrink-0 bg-white border border-emerald-200 text-[#2E5A44] px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1 hover:bg-emerald-50 transition-colors"
                            >
                                <Type size={14} />
                                {largeFont ? "기본 글자" : "큰 글자"}
                            </button>
                        </div>

                        {/* Passage Card */}
                        <article className="bg-white rounded-[32px] border border-gray-100 p-6 sm:p-10 shadow-[0_4px_24px_rgba(0,0,0,0.03)]">
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                                <span className="bg-[#2E5A44] text-white text-xs font-extrabold px-3 py-1 rounded-full">
                                    {passage.genre}
                                </span>
                                <span className="bg-gray-100 text-gray-600 text-xs font-bold px-3 py-1 rounded-full">
                                    총 {passage.word_count}어절 · 권장 속도 분당 {passage.norm_wpm || 135}어절
                                </span>
                            </div>

                            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-[#1A1A1A] tracking-tight mb-6 pb-4 border-b border-gray-100 break-keep">
                                {passage.title}
                            </h1>

                            <div
                                className={`${
                                    largeFont
                                        ? "text-lg sm:text-xl leading-[2.0]"
                                        : "text-base sm:text-lg leading-[1.9]"
                                } font-medium text-[#1A1A1A] break-keep whitespace-pre-line tracking-tight`}
                            >
                                {passage.content}
                            </div>

                            {/* Key Vocabularies Box (국립국어원 한국어기초사전 연계) */}
                            {passage.key_vocabularies && passage.key_vocabularies.length > 0 && (
                                <div className="mt-8 pt-6 border-t border-gray-100">
                                    <div className="flex items-center gap-1.5 text-xs font-black text-[#2E5A44] mb-3">
                                        <ShieldCheck size={15} className="text-[#16A34A]" />
                                        핵심 어휘 힌트
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                        {passage.key_vocabularies.map((v, idx) => (
                                            <div
                                                key={idx}
                                                className="bg-[#F9FAFB] rounded-2xl p-3 border border-gray-100"
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs font-black text-[#2E5A44]">
                                                        {v.word}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-gray-400">
                                                        {v.level}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-gray-600 font-medium leading-snug break-keep">
                                                    {v.meaning}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <p className="mt-4 text-[11px] font-semibold text-gray-400 text-right">
                                Book,ok 제작 지문
                            </p>
                        </article>

                        <button
                            type="button"
                            onClick={handleFinishReading}
                            className="w-full bg-[#16A34A] hover:bg-green-700 text-white font-black py-5 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-base sm:text-lg active:scale-[0.99]"
                        >
                            <CheckCircle2 size={20} />
                            다 읽었어요! 문제 풀러 가기 ({formatTime(readingSeconds)})
                        </button>
                    </div>
                )}

                {/* ================= STEP 2: 4-AREA QUIZ ================= */}
                {step === "quiz" && passage && currentQuestion && (
                    <div className="space-y-5 animate-in fade-in duration-300">
                        {/* Progress Bar */}
                        <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                            <div
                                className="bg-[#16A34A] h-full rounded-full transition-all duration-300"
                                style={{
                                    width: `${((currentQIdx + 1) / questions.length) * 100}%`,
                                }}
                            />
                        </div>

                        {/* Toggleable Passage Reference Drawer */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setShowPassageDrawer(!showPassageDrawer)}
                                className="w-full px-4 py-3 flex items-center justify-between text-xs font-extrabold text-[#2E5A44] bg-emerald-50/50 hover:bg-emerald-50 transition-colors"
                            >
                                <span className="flex items-center gap-1.5">
                                    {showPassageDrawer ? <EyeOff size={15} /> : <Eye size={15} />}
                                    📖 지문 다시 보기 ({passage.title})
                                </span>
                                <span className="text-[11px] font-bold text-[#16A34A]">
                                    {showPassageDrawer ? "접기 ▲" : "펼쳐서 확인하기 ▼"}
                                </span>
                            </button>
                            {showPassageDrawer && (
                                <div className="p-5 bg-white border-t border-gray-100 max-h-60 overflow-y-auto text-sm text-gray-700 leading-relaxed break-keep">
                                    {passage.content}
                                </div>
                            )}
                        </div>

                        {/* Question Card */}
                        <div className="bg-white rounded-[32px] border border-gray-100 p-6 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-6">
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <span
                                        className={`text-xs font-extrabold px-3 py-1 rounded-full border ${
                                            AREA_METADATA[currentQuestion.area]?.badgeColor ||
                                            "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        }`}
                                    >
                                        영역 {currentQIdx + 1} ·{" "}
                                        {AREA_METADATA[currentQuestion.area]?.label ||
                                            currentQuestion.area}
                                    </span>
                                    <span className="text-[11px] font-bold text-gray-400">
                                        {AREA_METADATA[currentQuestion.area]?.description}
                                    </span>
                                </div>

                                <h2 className="text-lg sm:text-xl font-black text-[#1A1A1A] leading-snug break-keep">
                                    Q{currentQIdx + 1}. {currentQuestion.question}
                                </h2>
                            </div>

                            {/* 4 Options */}
                            <div
                                className="space-y-3"
                                role="radiogroup"
                                aria-label={`문항 ${currentQIdx + 1} 보기`}
                            >
                                {currentQuestion.options.map((opt, oIdx) => {
                                    const isSelected = selectedOptions[currentQuestion.id] === oIdx;
                                    return (
                                        <button
                                            key={oIdx}
                                            type="button"
                                            role="radio"
                                            aria-checked={isSelected}
                                            onClick={() =>
                                                handleSelectOption(currentQuestion.id, oIdx)
                                            }
                                            className={`w-full p-4 sm:p-5 rounded-2xl border text-left transition-all flex items-start gap-3 active:scale-[0.99] ${
                                                isSelected
                                                    ? "bg-[#E8F5E9] border-[#16A34A] text-[#1A1A1A] shadow-xs ring-2 ring-[#16A34A]/20"
                                                    : "bg-[#F9FAFB] hover:bg-gray-100/80 border-gray-100 text-gray-800"
                                            }`}
                                        >
                                            <span
                                                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5 ${
                                                    isSelected
                                                        ? "bg-[#16A34A] text-white"
                                                        : "bg-white border border-gray-200 text-gray-500"
                                                }`}
                                            >
                                                {oIdx + 1}
                                            </span>
                                            <span className="text-sm sm:text-base font-bold leading-relaxed break-keep flex-1">
                                                {opt}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Prev / Next / Submit Navigation */}
                            <div className="flex items-center justify-between gap-3 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    disabled={currentQIdx === 0}
                                    onClick={() => goToQuestion(-1)}
                                    className="px-5 py-3.5 rounded-2xl border border-gray-200 text-xs sm:text-sm font-extrabold text-gray-600 disabled:opacity-40 flex items-center gap-1 hover:bg-gray-50 transition-colors"
                                >
                                    <ChevronLeft size={16} /> 이전 문항
                                </button>

                                {currentQIdx < questions.length - 1 ? (
                                    <button
                                        type="button"
                                        disabled={
                                            typeof selectedOptions[currentQuestion.id] !== "number"
                                        }
                                        onClick={() => goToQuestion(1)}
                                        className="flex-1 sm:flex-initial px-7 py-3.5 rounded-2xl bg-[#2E5A44] hover:bg-[#1E3F2F] disabled:bg-gray-200 disabled:text-gray-400 text-white text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1 shadow-sm"
                                    >
                                        다음 문항 <ChevronRight size={16} />
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        disabled={
                                            typeof selectedOptions[currentQuestion.id] !== "number"
                                        }
                                        onClick={handleSubmitQuiz}
                                        className="flex-1 sm:flex-initial px-7 py-3.5 rounded-2xl bg-[#16A34A] hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 shadow-md"
                                    >
                                        <Sparkles size={16} />
                                        결과 및 맞춤 도서 처방 보기
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ================= STEP 3: 5-AXIS BLI REPORT & PRESCRIPTION ================= */}
                {step === "report" && assessmentResult && (
                    <LiteracyReportView
                        assessment={assessmentResult}
                        child={activeChild}
                        onRetake={() => loadTestSession(targetGrade, true)}
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

