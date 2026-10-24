"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { toast } from "sonner";
import { Child, LiteracyAssessment, LiteracyPassage, LiteracyQuestion } from "@shared/types";
import { trackEvent } from "@shared/lib/analytics";
import {
    LiteracyApiError,
    LiteracyWordCheckResult,
    SubmitLiteracyAnswerItem,
    checkLiteracyWord,
    startLiteracyTest,
    submitLiteracyTest,
} from "./api";

/** words: 지문 없이 바로 푸는 낱말 퀴즈 (지문 읽기 전) */
export type TestStep = "loading" | "words" | "reading" | "quiz" | "submitting" | "report";

/** 보기에서 "잘 모르겠어요"를 고른 경우의 선택 값 */
export const UNSURE_OPTION = -1;

const PROGRESS_KEY = "bookok_literacy_progress";
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;
const MIN_READING_SECONDS_BEFORE_QUIZ = 6;

interface SavedProgress {
    childId: string | null;
    grade: number;
    passage: LiteracyPassage;
    questions: LiteracyQuestion[];
    sessionToken?: string;
    step: "words" | "reading" | "quiz";
    wordQuestions?: LiteracyQuestion[];
    wordResults?: Record<string, LiteracyWordCheckResult>;
    wordIdx?: number;
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

export function clearLiteracyProgress() {
    try {
        sessionStorage.removeItem(PROGRESS_KEY);
    } catch {
        // 저장소를 쓸 수 없는 환경에서는 무시
    }
}

/** 서버 세션 토큰(passageId|user|issuedAt|nonce|sig)의 발급 시각이 유효 기간 안인지 확인 */
function isTokenFresh(token?: string): boolean {
    const issuedAt = Number(token?.split("|")[2]);
    return Number.isFinite(issuedAt) && Date.now() - issuedAt < SESSION_TTL_MS - 5 * 60 * 1000;
}

interface UseLiteracyTestOptions {
    activeChild: Child | null;
    targetGrade: number;
    /** 인증/자녀 정보가 준비된 뒤에만 지문을 불러온다 */
    ready: boolean;
    /** 지문을 불러오지 못했을 때 호출 (보통 목록 화면으로 이동) */
    onLoadFailed: () => void;
}

export function useLiteracyTest({ activeChild, targetGrade, ready, onLoadFailed }: UseLiteracyTestOptions) {
    const [step, setStep] = useState<TestStep>("loading");
    const [passage, setPassage] = useState<LiteracyPassage | null>(null);
    const [questions, setQuestions] = useState<LiteracyQuestion[]>([]);
    const [wordQuestions, setWordQuestions] = useState<LiteracyQuestion[]>([]);
    const [wordResults, setWordResults] = useState<Record<string, LiteracyWordCheckResult>>({});
    const [wordIdx, setWordIdx] = useState(0);
    const [wordPendingId, setWordPendingId] = useState<string | null>(null);
    const [sessionToken, setSessionToken] = useState<string | undefined>(undefined);
    const [readingSeconds, setReadingSeconds] = useState(0);
    const [skimWarned, setSkimWarned] = useState(false);
    const [currentQIdx, setCurrentQIdx] = useState(0);
    const [selectedOptions, setSelectedOptions] = useState<Record<string, number>>({});
    const [questionTimes, setQuestionTimes] = useState<Record<string, number>>({});
    const [assessmentResult, setAssessmentResult] = useState<LiteracyAssessment | null>(null);

    const readingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const questionStartRef = useRef<number>(Date.now());
    // 최신 콜백을 effect 의존성 없이 참조
    const onLoadFailedRef = useRef(onLoadFailed);
    useEffect(() => {
        onLoadFailedRef.current = onLoadFailed;
    }, [onLoadFailed]);

    const childKey = activeChild?.id != null ? String(activeChild.id) : null;
    // 배열 참조가 바뀌어도 내용이 같으면 지문을 다시 불러오지 않도록 문자열 키로 비교한다
    const topicsKey = (activeChild?.preferred_topics || []).join(",");

    const resetSessionState = () => {
        setWordQuestions([]);
        setWordResults({});
        setWordIdx(0);
        setWordPendingId(null);
        setReadingSeconds(0);
        setSkimWarned(false);
        setCurrentQIdx(0);
        setSelectedOptions({});
        setQuestionTimes({});
        setAssessmentResult(null);
    };

    const loadTestSession = useCallback(
        async (forceNew = false) => {
            // 새로고침·앱 전환으로 끊긴 진행 중 진단 복원
            const saved = forceNew ? null : readProgress();
            if (
                saved &&
                saved.grade === targetGrade &&
                saved.childId === childKey &&
                isTokenFresh(saved.sessionToken)
            ) {
                setPassage(saved.passage);
                setQuestions(saved.questions);
                setWordQuestions(saved.wordQuestions || []);
                setWordResults(saved.wordResults || {});
                setWordIdx(saved.wordIdx || 0);
                setWordPendingId(null);
                setSessionToken(saved.sessionToken);
                setReadingSeconds(saved.readingSeconds);
                setCurrentQIdx(Math.min(saved.currentQIdx, saved.questions.length - 1));
                setSelectedOptions(saved.selectedOptions);
                setQuestionTimes(saved.questionTimes);
                setSkimWarned(false);
                setAssessmentResult(null);
                questionStartRef.current = Date.now();
                setStep(saved.step);
                return;
            }
            clearLiteracyProgress();

            setStep("loading");
            resetSessionState();

            try {
                const res = await startLiteracyTest({
                    childId: activeChild?.id,
                    childAge: activeChild?.age,
                    gradeLevel: targetGrade,
                    preferredTopics: activeChild?.preferred_topics || [],
                });
                setPassage(res.passage);
                setQuestions(res.questions);
                const words = res.word_questions || [];
                setWordQuestions(words);
                setSessionToken(res.session_token);
                // 낱말 퀴즈가 준비된 학년은 지문 없이 바로 푸는 문제부터 시작한다
                setStep(words.length > 0 ? "words" : "reading");
                trackEvent("literacy_start", {
                    grade: res.passage.grade_level,
                    logged_in: !!activeChild,
                    word_quiz: words.length > 0,
                });
            } catch (err) {
                toast.error(err instanceof Error && err.message ? err.message : "진단 문항을 불러오는 중 오류가 발생했습니다.");
                onLoadFailedRef.current();
            }
        },
        // activeChild는 id/나이/관심사만 사용하므로 해당 값 변화에만 반응한다
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [targetGrade, childKey, activeChild?.age, topicsKey]
    );

    useEffect(() => {
        if (!ready) return;
        loadTestSession();
    }, [ready, loadTestSession]);

    // 읽기 타이머: 읽기 단계이면서 화면이 보이는 동안만 흐른다 (앱이 백그라운드로 가면 멈춤)
    useEffect(() => {
        if (step !== "reading") return;
        const stop = () => {
            if (readingTimerRef.current) {
                clearInterval(readingTimerRef.current);
                readingTimerRef.current = null;
            }
        };
        const start = () => {
            if (!readingTimerRef.current) {
                readingTimerRef.current = setInterval(() => setReadingSeconds((p) => p + 1), 1000);
            }
        };
        const onVisibility = () => (document.hidden ? stop() : start());
        if (!document.hidden) start();
        document.addEventListener("visibilitychange", onVisibility);
        return () => {
            document.removeEventListener("visibilitychange", onVisibility);
            stop();
        };
    }, [step]);

    // 진행 상태 저장 (낱말 퀴즈/읽기/문항 단계에서만)
    useEffect(() => {
        if ((step !== "words" && step !== "reading" && step !== "quiz") || !passage) return;
        try {
            const progress: SavedProgress = {
                childId: childKey,
                grade: targetGrade,
                passage,
                questions,
                wordQuestions,
                wordResults,
                wordIdx,
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
    }, [step, passage, questions, wordQuestions, wordResults, wordIdx, sessionToken, readingSeconds, currentQIdx, selectedOptions, questionTimes, childKey, targetGrade]);

    // 문항별 풀이 시간 측정 시작
    useEffect(() => {
        if (step === "quiz") questionStartRef.current = Date.now();
    }, [step, currentQIdx]);

    const currentQuestion = questions[currentQIdx];

    // 낱말 퀴즈: 연속 정답(콤보)과 최고 기록은 점수에 반영하지 않는 재미 요소다
    const wordStats = (() => {
        let combo = 0;
        let best = 0;
        let correct = 0;
        for (const q of wordQuestions) {
            const r = wordResults[q.id];
            if (!r) break;
            if (r.is_correct) {
                correct++;
                combo++;
                best = Math.max(best, combo);
            } else {
                combo = 0;
            }
        }
        return { combo, best, correct, answered: Object.keys(wordResults).length };
    })();

    /** 낱말 퀴즈 한 문항 답하기: 서버가 첫 답을 고정하고 정답·해설을 바로 알려 준다 */
    const handleWordAnswer = async (question: LiteracyQuestion, optionIdx: number) => {
        if (!passage || wordResults[question.id] || wordPendingId) return;
        setWordPendingId(question.id);
        try {
            const result = await checkLiteracyWord({
                passageId: passage.id,
                sessionToken,
                questionId: question.id,
                selected: optionIdx,
            });
            setWordResults((prev) => ({ ...prev, [question.id]: result }));
            if (Capacitor.isNativePlatform()) {
                void Haptics.impact({ style: result.is_correct ? ImpactStyle.Medium : ImpactStyle.Light });
            }
        } catch (err) {
            toast.error(err instanceof Error && err.message ? err.message : "답을 확인하지 못했어요. 다시 눌러 주세요.");
            // 만료된 세션은 같은 토큰으로 계속할 수 없으므로 새로 시작한다
            if (err instanceof LiteracyApiError && err.status === 400) loadTestSession(true);
        } finally {
            setWordPendingId(null);
        }
    };

    const handleWordNext = () => setWordIdx((i) => Math.min(i + 1, wordQuestions.length));

    const handleWordsDone = () => {
        setStep("reading");
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleFinishReading = async () => {
        if (Capacitor.isNativePlatform()) await Haptics.impact({ style: ImpactStyle.Medium });

        // 너무 빨리 넘기면 한 번 부드럽게 안내
        if (readingSeconds < MIN_READING_SECONDS_BEFORE_QUIZ && !skimWarned) {
            setSkimWarned(true);
            toast.info("지문을 조금만 더 꼼꼼히 읽고 문제를 풀어볼까요? 한 번 더 누르면 문제로 넘어갑니다.");
            return;
        }
        setStep("quiz");
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleSelectOption = (questionId: string, optionIdx: number) => {
        if (Capacitor.isNativePlatform()) void Haptics.impact({ style: ImpactStyle.Light });
        setSelectedOptions((prev) => ({ ...prev, [questionId]: optionIdx }));
    };

    // 문항을 떠날 때(이전/다음/제출) 그 문항에서 보낸 시간을 한 번만 누적한다
    const commitQuestionTime = (questionId: string): Record<string, number> => {
        const elapsedSec = Math.max(Math.round((Date.now() - questionStartRef.current) / 1000), 2);
        questionStartRef.current = Date.now();
        const next = { ...questionTimes, [questionId]: (questionTimes[questionId] || 0) + elapsedSec };
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
        if (Capacitor.isNativePlatform()) await Haptics.impact({ style: ImpactStyle.Medium });

        setStep("submitting");
        try {
            const answersPayload: SubmitLiteracyAnswerItem[] = questions.map((q) => {
                const choice = selectedOptions[q.id];
                const answered = typeof choice === "number";
                return {
                    question_id: q.id,
                    area: q.area,
                    selected: answered ? choice : UNSURE_OPTION,
                    unsure: answered && choice === UNSURE_OPTION,
                    time_spent_sec: finalTimes[q.id] || 0,
                };
            });

            const result = await submitLiteracyTest({
                childId: activeChild?.id || null,
                passageId: passage.id,
                sessionToken,
                gradeLevel: passage.grade_level,
                readingTimeSeconds: Math.max(readingSeconds, 8),
                answers: answersPayload,
                preferredTopics: activeChild?.preferred_topics || [],
            });

            clearLiteracyProgress();
            trackEvent("literacy_complete", {
                grade: result.grade_level,
                logged_in: !!activeChild,
                saved: !!result.saved,
            });
            setAssessmentResult(result);
            setStep("report");
            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (err) {
            const message = err instanceof Error && err.message ? err.message : "채점 중 오류가 발생했습니다.";
            toast.error(message);
            // 만료·중복 제출(400/409)은 같은 세션으로 다시 보낼 수 없으므로 새로 시작한다
            if (err instanceof LiteracyApiError && (err.status === 400 || err.status === 409)) {
                loadTestSession(true);
            } else {
                setStep("quiz");
            }
        }
    };

    return {
        step,
        passage,
        questions,
        wordQuestions,
        wordResults,
        wordIdx,
        wordPendingId,
        wordStats,
        handleWordAnswer,
        handleWordNext,
        handleWordsDone,
        currentQuestion,
        currentQIdx,
        readingSeconds,
        selectedOptions,
        assessmentResult,
        handleFinishReading,
        handleSelectOption,
        goToQuestion,
        handleSubmitQuiz,
        retake: () => loadTestSession(true),
    };
}
