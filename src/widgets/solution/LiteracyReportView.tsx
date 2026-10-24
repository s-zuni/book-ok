"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
    Legend,
    Tooltip,
} from "recharts";
import {
    Sparkles,
    Award,
    Clock,
    CheckCircle2,
    XCircle,
    BookOpen,
    ChevronDown,
    ChevronUp,
    MessageSquareHeart,
    RotateCcw,
    ArrowUpRight,
    ShieldCheck,
    Share2,
    Loader2,
} from "lucide-react";
import { Child, LiteracyAssessment } from "@shared/types";
import { AREA_METADATA, buildRadarChartData, isLegacyScoring } from "@features/literacy/scoring";
import { useLoginModal } from "@features/auth/LoginModalContext";
import {
    buildShareUrl,
    renderLiteracyShareCard,
    shareOrDownloadCard,
} from "@features/literacy/shareCard";
import { trackEvent } from "@shared/lib/analytics";
import OptimizedImage from "@shared/ui/OptimizedImage";
import BookRating from "@shared/ui/BookRating";
import { renderSafeMarkdown } from "@shared/lib/renderSafeMarkdown";

interface LiteracyReportViewProps {
    assessment: LiteracyAssessment;
    child?: Child | null;
    onRetake?: () => void;
    onConsultAI?: (assessment: LiteracyAssessment) => void;
    compact?: boolean;
}

export default function LiteracyReportView({
    assessment,
    child,
    onRetake,
    onConsultAI,
    compact = false,
}: LiteracyReportViewProps) {
    const { openLoginModal } = useLoginModal();
    const [expandedQIdx, setExpandedQIdx] = useState<number | null>(0);
    const childName = child?.name || "우리 아이";
    const radarData = buildRadarChartData(assessment);
    const [sharing, setSharing] = useState(false);

    const handleShareCard = async () => {
        if (sharing) return;
        setSharing(true);
        trackEvent("literacy_share_click", { grade: assessment.grade_level });
        try {
            const blob = await renderLiteracyShareCard(assessment);
            const result = await shareOrDownloadCard(
                blob,
                `우리 아이 문해력 점검 결과 ${assessment.total_bli_score}점 (${assessment.bli_tier}) — Book,ok`,
                buildShareUrl()
            );
            if (result === "downloaded") {
                toast.success("카드 이미지를 저장했어요. SNS에 올려 보세요!");
            }
            if (result !== "cancelled") {
                trackEvent("literacy_share_done", { method: result, grade: assessment.grade_level });
            }
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "공유 카드를 만들지 못했어요.");
        } finally {
            setSharing(false);
        }
    };

    const isBalanced = assessment.weakest_area === "balanced";
    const weakestMeta = AREA_METADATA[assessment.weakest_area] || AREA_METADATA.balanced;
    const strengthMeta = AREA_METADATA[assessment.strength_area] || AREA_METADATA.balanced;

    // Highlight evidence sentence inside passage content
    const renderHighlightedPassage = (content: string | undefined, evidence: string) => {
        if (!content) return null;
        const cleanEvidence = evidence.trim();
        if (!cleanEvidence || !content.includes(cleanEvidence)) {
            return <p className="text-xs lg:text-sm text-gray-600 leading-relaxed">{content}</p>;
        }
        const parts = content.split(cleanEvidence);
        return (
            <p className="text-xs lg:text-sm text-gray-600 leading-relaxed break-keep">
                {parts[0]}
                <mark className="bg-[#16A34A]/15 text-[#2E5A44] font-extrabold px-1.5 py-0.5 rounded-md border border-[#16A34A]/30">
                    {cleanEvidence}
                </mark>
                {parts.slice(1).join(cleanEvidence)}
            </p>
        );
    };

    const normWpm = assessment.norm_wpm || 135;
    const wpmPercent = Math.min(Math.round((assessment.effective_wpm / normWpm) * 100), 140);

    return (
        <div className="space-y-5 animate-in fade-in duration-300">
            {assessment.saved === false && (
                <div
                    role="status"
                    className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3"
                >
                    <p className="text-xs lg:text-sm font-bold text-amber-900 leading-relaxed break-keep">
                        {assessment.save_status === "guest"
                            ? "로그인하지 않아 이 결과는 저장되지 않았어요. 이 화면을 벗어나면 사라져요."
                            : assessment.save_status === "no_child"
                            ? "자녀를 등록하고 진단하면 결과가 저장돼요. 이 화면을 벗어나면 이번 결과는 사라져요."
                            : "결과를 저장하지 못했어요. 이 화면을 벗어나면 사라지니 공유 카드로 먼저 남겨 두세요."}
                    </p>
                    {assessment.save_status === "guest" && (
                        <button
                            type="button"
                            onClick={openLoginModal}
                            className="shrink-0 bg-[#16A34A] hover:bg-green-700 text-white text-xs font-black px-4 py-2 rounded-xl"
                        >
                            로그인하고 저장하기
                        </button>
                    )}
                </div>
            )}
            {isLegacyScoring(assessment) && (
                <div role="note" className="bg-gray-50 border border-gray-200 rounded-2xl p-3.5 text-xs font-bold text-gray-600 leading-relaxed break-keep">
                    이전 방식(점수 보정 포함)으로 계산된 기록이에요. 새 방식의 결과와 점수를 직접 비교하기는 어려워요.
                </div>
            )}

            {/* 1. Top Summary Hero Card */}
            <div className="bg-linear-to-br from-[#2E5A44] to-[#1E3F2F] text-white rounded-[32px] p-6 lg:p-8 shadow-lg relative overflow-hidden">
                <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/5 rounded-full blur-xl pointer-events-none" />
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                    <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-extrabold tracking-tight text-emerald-100">
                        <ShieldCheck size={14} />
                        Book,ok 문해력 점검 리포트
                    </span>
                    <span className="text-xs font-bold text-emerald-200/80">
                        {assessment.grade_label || `${assessment.grade_level}학년`} 기준 ·{" "}
                        {new Date(assessment.created_at).toLocaleDateString("ko-KR")}
                    </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                        <p className="text-emerald-100/90 text-xs lg:text-sm font-bold mb-1">
                            {childName}의 종합 점수 (이해 영역 평균)
                        </p>
                        <div className="flex items-baseline gap-2.5">
                            <span className="text-4xl lg:text-5xl font-black tracking-tight text-white">
                                {assessment.total_bli_score}
                            </span>
                            <span className="text-base font-bold text-emerald-200">/ 100점</span>
                            <span className="ml-1 bg-[#FACC15] text-[#1A1A1A] text-xs font-black px-3 py-1 rounded-full shadow-xs inline-flex items-center gap-1">
                                <Award size={13} />
                                {assessment.bli_tier}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 sm:w-auto w-full">
                        <div className="bg-white/10 backdrop-blur-xs rounded-2xl px-3.5 py-2.5 border border-white/10">
                            <span className="text-xs font-bold text-emerald-200 block">🌟 상대적으로 잘한 영역</span>
                            <span className="text-sm font-black text-white">{isBalanced ? "차이 없음" : strengthMeta.label}</span>
                        </div>
                        <div className="bg-white/10 backdrop-blur-xs rounded-2xl px-3.5 py-2.5 border border-white/10">
                            <span className="text-xs font-bold text-amber-200 block">🌱 더 살펴볼 영역</span>
                            <span className="text-sm font-black text-[#FACC15]">{isBalanced ? "차이 없음" : weakestMeta.label}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. 5-Axis Radar Chart & Fluency WPM Card */}
            <div className={`grid ${compact ? "grid-cols-1" : "lg:grid-cols-12"} gap-4`}>
                {/* 5-Axis Radar Chart */}
                <div className={`${compact ? "" : "lg:col-span-7"} bg-white rounded-[32px] border border-gray-100 p-5 lg:p-7 shadow-[0_4px_20px_rgba(0,0,0,0.03)]`}>
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <h3 className="font-extrabold text-base lg:text-lg text-[#1A1A1A] tracking-tight">
                                영역별 결과
                            </h3>
                            <p className="text-xs text-gray-500 font-medium">
                                어휘 · 사실 · 추론 · 비판 영역의 정답률{radarData.length > 4 ? " (읽기 속도는 참고 지표)" : ""}
                            </p>
                            <p className="text-xs text-gray-500 font-medium mt-0.5">
                                지문 1편, 영역당 문항 수가 적은 참고용 결과예요. 한 문항 차이로도 달라질 수 있고, 전문적인 진단이 아니에요.
                            </p>
                        </div>
                    </div>

                    <div className="w-full h-[270px] lg:h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="72%" data={radarData}>
                                <PolarGrid stroke="#E5E7EB" />
                                <PolarAngleAxis
                                    dataKey="subject"
                                    tick={{ fill: "#1F2937", fontSize: 12, fontWeight: 800 }}
                                />
                                <PolarRadiusAxis
                                    angle={90}
                                    domain={[0, 100]}
                                    tick={{ fontSize: 10, fill: "#9CA3AF" }}
                                    tickCount={5}
                                />
                                <Radar
                                    name={`${childName} 점수`}
                                    dataKey="childScore"
                                    stroke="#16A34A"
                                    strokeWidth={2.5}
                                    fill="#16A34A"
                                    fillOpacity={0.35}
                                />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: "16px",
                                        border: "1px solid #F3F4F6",
                                        fontSize: "12px",
                                        fontWeight: 700,
                                    }}
                                />
                                <Legend wrapperStyle={{ fontSize: "12px", fontWeight: 700 }} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* 5 Area Score Pills */}
                    <div className={`grid ${radarData.length > 4 ? "grid-cols-5" : "grid-cols-4"} gap-1.5 pt-2 border-t border-gray-100`}>
                        {radarData.map((item) => {
                            const isWeakest = !isBalanced && item.key === assessment.weakest_area;
                            return (
                                <div
                                    key={item.key}
                                    className={`rounded-2xl p-2 text-center border ${
                                        isWeakest
                                            ? "bg-amber-50/70 border-amber-200"
                                            : "bg-gray-50/80 border-gray-100"
                                    }`}
                                >
                                    <span className="text-xs font-bold text-gray-500 block truncate">
                                        {item.subject.replace("적 이해", "").replace("읽기 ", "")}
                                    </span>
                                    <span
                                        className={`text-sm font-black ${
                                            isWeakest ? "text-amber-600" : "text-[#2E5A44]"
                                        }`}
                                    >
                                        {item.childScore}%
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Fluency (WPM) & Passage Info Card */}
                <div className={`${compact ? "" : "lg:col-span-5"} bg-white rounded-[32px] border border-gray-100 p-5 lg:p-7 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between space-y-4`}>
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-[#16A34A] flex items-center justify-center">
                                <Clock size={18} />
                            </div>
                            <div>
                                <h3 className="font-extrabold text-base text-[#1A1A1A] tracking-tight">
                                    읽기 속도 (참고)
                                </h3>
                                <p className="text-xs text-gray-500 font-semibold">
                                    자체 설정한 학년 참고 속도와 비교한 값이에요
                                </p>
                            </div>
                        </div>

                        <div className="bg-[#F9FAFB] rounded-2xl p-4 border border-gray-100 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-500">응시 지문</span>
                                <span className="text-xs font-extrabold text-gray-900 truncate max-w-[180px]">
                                    {assessment.passage_title || "맞춤 진단 지문"}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-500">지문 분량 / 소요 시간</span>
                                <span className="text-xs font-extrabold text-gray-900">
                                    {assessment.word_count || 90}어절 · {assessment.reading_time_seconds}초
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-500">읽기 속도</span>
                                {typeof assessment.score_fluency === "number" ? (
                                    <span className="text-sm font-black text-[#16A34A]">
                                        분당 {assessment.effective_wpm}어절{" "}
                                        <span className="text-xs font-bold text-gray-500">(참고 {normWpm}어절)</span>
                                    </span>
                                ) : (
                                    <span className="text-xs font-extrabold text-gray-600">측정하지 않았어요</span>
                                )}
                            </div>

                            {typeof assessment.score_fluency !== "number" && (
                                <p className="text-xs text-gray-500 font-medium leading-relaxed break-keep">
                                    {assessment.fluency_reason === "toddler"
                                        ? "유아는 부모님과 함께 읽기 때문에 속도를 측정하지 않아요."
                                        : assessment.fluency_reason === "too_fast"
                                        ? "너무 빠르게 넘겨서 속도를 계산하지 않았어요. 천천히 읽어 보면 측정할 수 있어요."
                                        : "읽기 속도 정보가 없는 기록이에요."}
                                </p>
                            )}
                            {/* WPM Gauge Bar */}
                            {typeof assessment.score_fluency === "number" && (
                            <div className="pt-1">
                                <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-linear-to-r from-[#2E5A44] to-[#16A34A] rounded-full transition-all duration-700"
                                        style={{ width: `${Math.min(wpmPercent, 100)}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-xs font-bold text-gray-500 mt-1">
                                    <span>천천히 꼼꼼히</span>
                                    <span className="text-[#16A34A]">참고 속도 ({normWpm}어절)</span>
                                    <span>빠른 독해</span>
                                </div>
                            </div>
                            )}
                        </div>
                    </div>

                    {/* Weak Area Coaching Callout */}
                    <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-4">
                        <div className="flex items-center gap-1.5 text-xs font-black text-[#2E5A44] mb-1">
                            <Sparkles size={14} className="text-[#16A34A]" />
                            가정에서 해볼 수 있는 팁{isBalanced ? "" : ` (${weakestMeta.label})`}
                        </div>
                        <p className="text-xs text-gray-700 font-medium leading-relaxed break-keep">
                            {assessment.coaching_tip || weakestMeta.coachingGuide}
                        </p>
                    </div>
                </div>
            </div>

            {/* 3. AI Diagnosis Expert Summary */}
            <div className="bg-white rounded-[32px] border border-gray-100 p-6 lg:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                <div
                    className="prose prose-sm lg:prose-base max-w-none text-gray-700 leading-relaxed break-keep prose-headings:text-[#2E5A44] prose-headings:font-black prose-strong:text-gray-900"
                    dangerouslySetInnerHTML={{
                        __html: renderSafeMarkdown(assessment.ai_diagnosis_summary),
                    }}
                />
            </div>

            {/* 4. 보완 영역 관련 추천 도서 */}
            {assessment.prescribed_books && assessment.prescribed_books.length > 0 && (
                <div className="bg-white rounded-[32px] border border-emerald-100 p-6 lg:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
                        <div>
                            <span className="text-xs font-black text-[#16A34A] block">함께 읽어 볼 만한 책</span>
                            <h3 className="text-lg lg:text-xl font-black text-[#1A1A1A] tracking-tight mt-0.5">
                                {isBalanced ? (
                                    <>{childName}와 함께 읽어 볼 책</>
                                ) : (
                                    <>
                                        {childName}의{" "}
                                        <span className="text-[#16A34A] underline decoration-emerald-200 decoration-4 underline-offset-4">
                                            {weakestMeta.label}
                                        </span>
                                        을 키워 줄 책
                                    </>
                                )}
                            </h3>
                        </div>
                        <span className="text-xs font-bold text-gray-500">
                            눌러서 상세 정보와 도서관 대출 현황 확인
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {assessment.prescribed_books
                            .filter((book) => book.id || book.bookid)
                            .map((book, idx) => (
                            <Link
                                key={book.id || idx}
                                href={`/book/?id=${book.id || book.bookid}`}
                                className="group bg-[#F9FAFB] hover:bg-white rounded-[24px] p-4 border border-gray-100 hover:border-[#16A34A]/40 transition-all duration-300 cursor-pointer flex sm:flex-col gap-4 hover:shadow-md"
                            >
                                <div className="relative w-24 sm:w-full h-32 sm:h-48 rounded-xl overflow-hidden bg-white border border-gray-100 shrink-0">
                                    <OptimizedImage
                                        src={book.coverUrl || book.imgsrc}
                                        alt={book.title}
                                        fill
                                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                                        sizes="(max-width: 640px) 96px, 220px"
                                        sizePreset="thumbnail"
                                    />
                                    <span className="absolute top-2 left-2 bg-[#2E5A44] text-white text-xs font-extrabold px-2.5 py-0.5 rounded-full shadow-xs">
                                        {book.prescriptionArea || weakestMeta.shortLabel} 관련
                                    </span>
                                </div>

                                <div className="flex-1 flex flex-col justify-between">
                                    <div>
                                        <h4 className="font-extrabold text-sm text-[#1A1A1A] line-clamp-2 group-hover:text-[#16A34A] transition-colors">
                                            {book.title}
                                        </h4>
                                        <p className="text-xs text-gray-500 font-bold mt-1 truncate">
                                            {book.author} · {book.publisher}
                                        </p>
                                        <p className="text-xs text-gray-600 font-medium mt-2 line-clamp-2 leading-relaxed">
                                            {book.prescriptionKeyword
                                                ? `'${book.prescriptionKeyword}' 검색 결과에서 골랐어요.`
                                                : book.prescriptionReason}
                                        </p>
                                    </div>

                                    <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between">
                                        <BookRating rating={book.rating} iconSize={11} className="text-xs" />
                                        <span className="text-xs font-extrabold text-[#16A34A] inline-flex items-center gap-0.5">
                                            상세·도서관 확인 <ArrowUpRight size={13} />
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* 5. Question-by-Question Review & Grounded Evidence Highlighter */}
            {assessment.answers && assessment.answers.length > 0 && (
                <div className="bg-white rounded-[32px] border border-gray-100 p-6 lg:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                    <div className="flex items-center gap-2 mb-4">
                        <BookOpen size={18} className="text-[#2E5A44]" />
                        <h3 className="font-extrabold text-base lg:text-lg text-[#1A1A1A] tracking-tight">
                            영역별 문항 해설 및 지문 근거 확인
                        </h3>
                    </div>

                    <div className="space-y-3">
                        {assessment.answers.map((ans, idx) => {
                            const isOpen = expandedQIdx === idx;
                            const areaInfo = AREA_METADATA[ans.area] || AREA_METADATA.vocabulary;
                            return (
                                <div
                                    key={ans.question_id || idx}
                                    className="rounded-2xl border border-gray-100 overflow-hidden bg-[#F9FAFB]"
                                >
                                    <button
                                        type="button"
                                        onClick={() => setExpandedQIdx(isOpen ? null : idx)}
                                        className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-100/70 transition-colors"
                                    >
                                        <div className="flex items-center gap-2.5 pr-2">
                                            {ans.is_correct ? (
                                                <CheckCircle2 size={18} className="text-[#16A34A] shrink-0" />
                                            ) : (
                                                <XCircle size={18} className="text-red-500 shrink-0" />
                                            )}
                                            <span
                                                className={`text-xs font-extrabold px-2 py-0.5 rounded-full border shrink-0 ${areaInfo.badgeColor}`}
                                            >
                                                {areaInfo.label}
                                            </span>
                                            <span className="text-xs lg:text-sm font-bold text-gray-900 line-clamp-1">
                                                Q{idx + 1}. {ans.question}
                                            </span>
                                        </div>
                                        {isOpen ? (
                                            <ChevronUp size={18} className="text-gray-500 shrink-0" />
                                        ) : (
                                            <ChevronDown size={18} className="text-gray-500 shrink-0" />
                                        )}
                                    </button>

                                    {isOpen && (
                                        <div className="px-4 pb-4 pt-2 bg-white border-t border-gray-100 space-y-3">
                                            {ans.unsure && (
                                                <p className="text-xs font-bold text-gray-600">🤔 이 문항은 &lsquo;잘 모르겠어요&rsquo;를 골랐어요.</p>
                                            )}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {ans.options.map((opt, oIdx) => {
                                                    const isCorrectOpt = oIdx === ans.correct_answer;
                                                    const isSelectedOpt = oIdx === ans.selected;
                                                    return (
                                                        <div
                                                            key={oIdx}
                                                            className={`p-2.5 rounded-xl text-xs font-bold border flex items-start gap-2 ${
                                                                isCorrectOpt
                                                                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                                                                    : isSelectedOpt
                                                                    ? "bg-red-50 border-red-200 text-red-700"
                                                                    : "bg-gray-50 border-gray-100 text-gray-500"
                                                            }`}
                                                        >
                                                            <span className="shrink-0 font-black">
                                                                {oIdx + 1}.
                                                            </span>
                                                            <span className="flex-1">{opt}</span>
                                                            {isCorrectOpt && (
                                                                <span className="text-xs font-black text-[#16A34A] shrink-0">
                                                                    정답
                                                                </span>
                                                            )}
                                                            {!isCorrectOpt && isSelectedOpt && (
                                                                <span className="text-xs font-black text-red-500 shrink-0">
                                                                    내 선택
                                                                </span>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Evidence Highlight Box */}
                                            <div className="bg-emerald-50/40 rounded-xl p-3.5 border border-emerald-100/80 space-y-1.5">
                                                <span className="text-xs font-black text-[#2E5A44] block">
                                                    🔍 지문 속 정답 근거 문장
                                                </span>
                                                {assessment.passage_content ? (
                                                    renderHighlightedPassage(
                                                        assessment.passage_content,
                                                        ans.evidence
                                                    )
                                                ) : (
                                                    <p className="text-xs font-bold text-[#2E5A44]">
                                                        &ldquo;{ans.evidence}&rdquo;
                                                    </p>
                                                )}
                                            </div>

                                            <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-700 leading-relaxed">
                                                <span className="font-black text-gray-900 mr-1.5">
                                                    💡 해설:
                                                </span>
                                                {ans.explanation}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* 6. Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <button
                    type="button"
                    onClick={handleShareCard}
                    disabled={sharing}
                    className="sm:w-auto w-full bg-[#FACC15] hover:bg-yellow-400 disabled:opacity-60 text-[#1A1A1A] font-black py-4 px-6 rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 text-sm active:scale-[0.99]"
                >
                    {sharing ? <Loader2 size={18} className="animate-spin" /> : <Share2 size={18} />}
                    결과 카드 공유하기
                </button>
                {onConsultAI && (
                    <button
                        type="button"
                        onClick={() => onConsultAI(assessment)}
                        className="flex-1 bg-[#16A34A] hover:bg-green-700 text-white font-black py-4 px-6 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 text-sm active:scale-[0.99]"
                    >
                        <MessageSquareHeart size={18} />
                        이 진단 결과로 AI 독서 전문가 상담받기
                    </button>
                )}
                {onRetake && (
                    <button
                        type="button"
                        onClick={onRetake}
                        className="sm:w-auto w-full bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 font-extrabold py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-2 text-sm active:scale-[0.99]"
                    >
                        <RotateCcw size={16} />
                        새로운 지문으로 다시 진단하기
                    </button>
                )}
            </div>
        </div>
    );
}

